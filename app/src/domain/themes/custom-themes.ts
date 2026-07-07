import { DEFAULT_THEME, THEMES } from './definitions';
import type { ThemeTokens } from './theme-tokens';

export const CUSTOM_THEME_SCHEMA_VERSION = 1 as const;
export const CUSTOM_THEME_PREFIX = 'custom:' as const;

export type ThemeRef = string | `${typeof CUSTOM_THEME_PREFIX}${string}`;
export type EditableThemeTokens = Omit<ThemeTokens, 'name'>;

export interface CustomTheme {
  schemaVersion: typeof CUSTOM_THEME_SCHEMA_VERSION;
  id: string;
  name: string;
  tokens: EditableThemeTokens;
  baseTheme: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredCustomThemeCollection {
  schemaVersion: typeof CUSTOM_THEME_SCHEMA_VERSION;
  themes: CustomTheme[];
}

export const EMPTY_CUSTOM_THEMES: StoredCustomThemeCollection = {
  schemaVersion: CUSTOM_THEME_SCHEMA_VERSION,
  themes: [],
};

export const THEME_TOKEN_KEYS = [
  'bg',
  'bgSecondary',
  'bgTertiary',
  'bgHover',
  'border',
  'borderLight',
  'borderHover',
  'text',
  'textMuted',
  'textDim',
  'textDimmer',
  'textBright',
  'accent',
  'onAccent',
  'accentLight',
  'accentBg',
  'accentBorder',
  'danger',
  'dangerHover',
  'shadow',
  'shadowStrong',
] as const satisfies readonly (keyof EditableThemeTokens)[];

const SAFE_CSS_COLOR = /^(?:#[\da-f]{3,8}|rgba?\([\d\s.,/+-]+\))$/i;

export function isSafeThemeValue(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 80 &&
    SAFE_CSS_COLOR.test(value.trim()) &&
    parseColor(value) !== null
  );
}

function safeId(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[\w-]{6,80}$/.test(value)) return null;
  return value;
}

export function customThemeRef(id: string): `${typeof CUSTOM_THEME_PREFIX}${string}` {
  return `${CUSTOM_THEME_PREFIX}${id}`;
}

export function customThemeId(ref: string): string | null {
  return ref.startsWith(CUSTOM_THEME_PREFIX) ? ref.slice(CUSTOM_THEME_PREFIX.length) || null : null;
}

export function editableTokens(tokens: ThemeTokens): EditableThemeTokens {
  const result = {} as EditableThemeTokens;
  for (const key of THEME_TOKEN_KEYS) result[key] = tokens[key];
  return result;
}

export function parseCustomThemeCollection(raw: unknown): StoredCustomThemeCollection {
  if (!raw || typeof raw !== 'object') return EMPTY_CUSTOM_THEMES;
  const input = raw as { schemaVersion?: unknown; themes?: unknown };
  if (input.schemaVersion !== CUSTOM_THEME_SCHEMA_VERSION || !Array.isArray(input.themes)) {
    return EMPTY_CUSTOM_THEMES;
  }
  const themes: CustomTheme[] = [];
  const seen = new Set<string>();
  for (const candidate of input.themes) {
    if (!candidate || typeof candidate !== 'object') continue;
    const item = candidate as Partial<CustomTheme>;
    const id = safeId(item.id);
    if (!id || seen.has(id)) continue;
    const baseTheme =
      typeof item.baseTheme === 'string' && THEMES[item.baseTheme] ? item.baseTheme : DEFAULT_THEME;
    const base = THEMES[baseTheme];
    const source = item.tokens && typeof item.tokens === 'object' ? item.tokens : {};
    const tokens = {} as EditableThemeTokens;
    for (const key of THEME_TOKEN_KEYS) {
      const value = (source as Partial<EditableThemeTokens>)[key];
      tokens[key] = isSafeThemeValue(value) ? value.trim() : base[key];
    }
    const now = new Date().toISOString();
    themes.push({
      schemaVersion: CUSTOM_THEME_SCHEMA_VERSION,
      id,
      name:
        typeof item.name === 'string' && item.name.trim()
          ? item.name.trim().slice(0, 50)
          : 'Custom theme',
      tokens,
      baseTheme,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : now,
    });
    seen.add(id);
  }
  return { schemaVersion: CUSTOM_THEME_SCHEMA_VERSION, themes };
}

export function resolveThemeTokens(
  ref: string,
  collection: StoredCustomThemeCollection = EMPTY_CUSTOM_THEMES,
): ThemeTokens {
  const id = customThemeId(ref);
  if (id) {
    const custom = collection.themes.find((theme) => theme.id === id);
    if (custom) return { name: custom.name, ...custom.tokens };
  }
  return THEMES[ref] ?? THEMES[DEFAULT_THEME];
}

export function createCustomTheme(
  name: string,
  baseTheme: string,
  source: ThemeTokens,
): CustomTheme {
  const now = new Date().toISOString();
  const id =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    schemaVersion: CUSTOM_THEME_SCHEMA_VERSION,
    id,
    name: name.trim().slice(0, 50) || 'Custom theme',
    tokens: editableTokens(source),
    baseTheme: THEMES[baseTheme] ? baseTheme : DEFAULT_THEME,
    createdAt: now,
    updatedAt: now,
  };
}

type Rgb = { r: number; g: number; b: number; a: number };

export function parseColor(value: string): Rgb | null {
  const hex = value.trim().match(/^#([\da-f]{3,8})$/i)?.[1];
  if (hex) {
    const expanded =
      hex.length === 3 || hex.length === 4 ? [...hex].map((c) => c + c).join('') : hex;
    if (expanded.length !== 6 && expanded.length !== 8) return null;
    return {
      r: parseInt(expanded.slice(0, 2), 16),
      g: parseInt(expanded.slice(2, 4), 16),
      b: parseInt(expanded.slice(4, 6), 16),
      a: expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1,
    };
  }
  const rgb = value.trim().match(/^rgba?\((.+)\)$/i)?.[1];
  if (!rgb) return null;
  const parts = rgb
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.slice(0, 3).some((part) => part < 0 || part > 255)) return null;
  if (parts.length > 3 && (parts[3] < 0 || parts[3] > 1)) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
}
