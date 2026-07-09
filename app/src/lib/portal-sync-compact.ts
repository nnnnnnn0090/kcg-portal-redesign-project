/**
 * マイリンク同期 JSON 用の短縮キー・値エンコード（v4）。
 */

import { SK } from '../contract/storage-keys';
import {
  EMPTY_CUSTOM_THEMES,
  parseCustomThemeCollection,
  THEME_TOKEN_KEYS,
  type CustomTheme,
  type StoredCustomThemeCollection,
} from '../domain/themes/custom-themes';

export const PORTAL_SYNC_PAYLOAD_VERSION = 4 as const;

/** storage キー → 1〜2 文字 */
export const PORTAL_SYNC_SHORT_KEY: Record<string, string> = {
  [SK.hideProfileName]: 'h',
  [SK.theme]: 't',
  [SK.customThemes]: 'ct',
  [SK.showKogiCalMascot]: 'k',
  [SK.showHomeCornerCharacter]: 'c',
  [SK.hideAssignmentCalendar]: 'a',
  [SK.shortcutConfig]: 'sc',
  [SK.portalGuidedTourDone]: 'g',
  [SK.portalLanguagePickerDone]: 'lp',
  [SK.home2WebMailOverlay]: 'w2',
  [SK.cplanOverlay]: 'cp',
  [SK.calendarWeekStart]: 'w',
  [SK.language]: 'ln',
  [SK.extensionVersionSeen]: 'ev',
  [SK.developerNoticeLang]: 'dn',
  [SK.developerSurveyAnswered]: 'ds',
  [SK.clientUserId]: 'id',
  [SK.communityDisclaimerAccepted]: 'cd',
};

const PORTAL_SYNC_LONG_KEY = Object.fromEntries(
  Object.entries(PORTAL_SYNC_SHORT_KEY).map(([longKey, shortKey]) => [shortKey, longKey]),
);

function compactBool(value: unknown): 0 | 1 | undefined {
  if (value === true) return 1;
  if (value === false) return 0;
  return undefined;
}

function expandBool(value: unknown): boolean | undefined {
  if (value === 1 || value === true) return true;
  if (value === 0 || value === false) return false;
  return undefined;
}

function compactWeek(value: unknown): 'm' | 's' | undefined {
  if (value === 'monday') return 'm';
  if (value === 'sunday') return 's';
  return undefined;
}

function expandWeek(value: unknown): 'monday' | 'sunday' | undefined {
  if (value === 'm' || value === 'monday') return 'monday';
  if (value === 's' || value === 'sunday') return 'sunday';
  return undefined;
}

function compactUuid(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const s = value.trim();
  if (!s) return undefined;
  return s.replace(/-/g, '');
}

function expandUuid(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const s = value.trim();
  if (!s) return undefined;
  if (s.includes('-')) return s;
  if (s.length !== 32) return s;
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function compactCustomTheme(theme: CustomTheme): unknown[] {
  return [
    theme.id,
    theme.name,
    theme.baseTheme,
    THEME_TOKEN_KEYS.map((key) => theme.tokens[key]),
    Math.floor(Date.parse(theme.createdAt) / 1000) || 0,
    Math.floor(Date.parse(theme.updatedAt) / 1000) || 0,
  ];
}

function expandCustomTheme(raw: unknown): CustomTheme | null {
  if (!Array.isArray(raw) || raw.length < 6) return null;
  const [id, name, baseTheme, tokenValues, createdAtSec, updatedAtSec] = raw;
  if (typeof id !== 'string' || typeof name !== 'string' || typeof baseTheme !== 'string') return null;
  if (!Array.isArray(tokenValues) || tokenValues.length !== THEME_TOKEN_KEYS.length) return null;
  const tokens = {} as CustomTheme['tokens'];
  for (let i = 0; i < THEME_TOKEN_KEYS.length; i += 1) {
    const v = tokenValues[i];
    if (typeof v !== 'string') return null;
    tokens[THEME_TOKEN_KEYS[i]] = v;
  }
  const createdAt = typeof createdAtSec === 'number' && createdAtSec > 0
    ? new Date(createdAtSec * 1000).toISOString()
    : new Date(0).toISOString();
  const updatedAt = typeof updatedAtSec === 'number' && updatedAtSec > 0
    ? new Date(updatedAtSec * 1000).toISOString()
    : createdAt;
  return {
    schemaVersion: 1,
    id,
    name,
    baseTheme,
    tokens,
    createdAt,
    updatedAt,
  };
}

function compactCustomThemes(value: unknown): unknown[] | undefined {
  const parsed = parseCustomThemeCollection(value);
  if (parsed.themes.length === 0) return undefined;
  return parsed.themes.map(compactCustomTheme);
}

function expandCustomThemes(value: unknown): StoredCustomThemeCollection {
  if (!Array.isArray(value)) return EMPTY_CUSTOM_THEMES;
  const themes = value.map(expandCustomTheme).filter((theme): theme is CustomTheme => theme !== null);
  return themes.length > 0 ? { schemaVersion: 1, themes } : EMPTY_CUSTOM_THEMES;
}

function compactPortalSyncValue(longKey: string, value: unknown): unknown {
  switch (longKey) {
    case SK.hideProfileName:
    case SK.showKogiCalMascot:
    case SK.showHomeCornerCharacter:
    case SK.hideAssignmentCalendar:
    case SK.kingLmsSyncPending:
    case SK.kingLmsSyncAwaitCourse:
    case SK.kingLmsCourseSyncToastQuiet:
    case SK.kingLmsAssignmentSyncPending:
    case SK.kingLmsAssignmentSyncAwaitCalendar:
    case SK.portalScrollToAssignmentOnce:
    case SK.portalGuidedTourDone:
    case SK.portalLanguagePickerDone:
    case SK.home2WebMailOverlay:
    case SK.cplanOverlay:
    case SK.communityDisclaimerAccepted:
      return compactBool(value);
    case SK.calendarWeekStart:
      return compactWeek(value) ?? value;
    case SK.clientUserId:
      return compactUuid(value);
    case SK.customThemes:
      return compactCustomThemes(value);
    default:
      return value;
  }
}

function expandPortalSyncValue(longKey: string, value: unknown): unknown {
  switch (longKey) {
    case SK.hideProfileName:
    case SK.showKogiCalMascot:
    case SK.showHomeCornerCharacter:
    case SK.hideAssignmentCalendar:
    case SK.kingLmsSyncPending:
    case SK.kingLmsSyncAwaitCourse:
    case SK.kingLmsCourseSyncToastQuiet:
    case SK.kingLmsAssignmentSyncPending:
    case SK.kingLmsAssignmentSyncAwaitCalendar:
    case SK.portalScrollToAssignmentOnce:
    case SK.portalGuidedTourDone:
    case SK.portalLanguagePickerDone:
    case SK.home2WebMailOverlay:
    case SK.cplanOverlay:
    case SK.communityDisclaimerAccepted:
      return expandBool(value);
    case SK.calendarWeekStart: {
      const week = expandWeek(value);
      return week ?? value;
    }
    case SK.clientUserId:
      return expandUuid(value);
    case SK.customThemes:
      return expandCustomThemes(value);
    default:
      return value;
  }
}

export function compactPortalSyncStorage(storage: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [longKey, value] of Object.entries(storage)) {
    const shortKey = PORTAL_SYNC_SHORT_KEY[longKey];
    if (!shortKey || value === undefined) continue;
    const compact = compactPortalSyncValue(longKey, value);
    if (compact !== undefined) out[shortKey] = compact;
  }
  return out;
}

export function expandPortalSyncStorage(compact: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [shortKey, value] of Object.entries(compact)) {
    const longKey = PORTAL_SYNC_LONG_KEY[shortKey];
    if (!longKey || value === undefined) continue;
    out[longKey] = expandPortalSyncValue(longKey, value);
  }
  return out;
}

export interface PortalSyncCompactPayload {
  v: typeof PORTAL_SYNC_PAYLOAD_VERSION;
  u: number;
  s: Record<string, unknown>;
}

export function encodePortalSyncCompactPayload(
  updatedAt: number,
  storage: Record<string, unknown>,
): string {
  const payload: PortalSyncCompactPayload = {
    v: PORTAL_SYNC_PAYLOAD_VERSION,
    u: Math.floor(updatedAt / 1000),
    s: compactPortalSyncStorage(storage),
  };
  return JSON.stringify(payload);
}

export function decodePortalSyncCompactPayload(json: string): PortalExtensionSnapshotLike | null {
  try {
    const raw = JSON.parse(json) as PortalSyncCompactPayload;
    if (!raw || raw.v !== PORTAL_SYNC_PAYLOAD_VERSION || typeof raw.u !== 'number' || !raw.s) {
      return null;
    }
    const updatedAt = raw.u < 1_000_000_000_000 ? raw.u * 1000 : raw.u;
    return {
      updatedAt,
      storage: expandPortalSyncStorage(raw.s),
    };
  } catch {
    return null;
  }
}

interface PortalExtensionSnapshotLike {
  updatedAt: number;
  storage: Record<string, unknown>;
}
