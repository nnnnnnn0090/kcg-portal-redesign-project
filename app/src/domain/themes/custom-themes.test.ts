import { describe, expect, it } from 'vitest';
import { THEMES } from './definitions';
import {
  createCustomTheme,
  customThemeRef,
  parseColor,
  parseCustomThemeCollection,
  resolveThemeTokens,
} from './custom-themes';

type Rgb = { r: number; g: number; b: number; a: number };

function luminance(rgb: Rgb): number {
  const channel = (n: number) => {
    const v = n / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function blend(foreground: Rgb, background: Rgb): Rgb {
  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1,
  };
}

function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return null;
  const l1 = luminance(blend(fg, bg));
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('custom theme storage', () => {
  it('保存した独自テーマを参照から解決する', () => {
    const theme = createCustomTheme('自作', 'dark', THEMES.dark);
    theme.tokens.accent = '#123456';
    const collection = { schemaVersion: 1 as const, themes: [theme] };
    expect(resolveThemeTokens(customThemeRef(theme.id), collection)).toMatchObject({
      name: '自作',
      accent: '#123456',
    });
  });

  it('存在しない参照と壊れたコレクションは標準テーマへ戻す', () => {
    expect(resolveThemeTokens('custom:missing').bg).toBe(THEMES.dark.bg);
    expect(parseCustomThemeCollection({ schemaVersion: 2, themes: [] }).themes).toEqual([]);
  });

  it('不足・不正トークンを基準テーマで補完する', () => {
    const parsed = parseCustomThemeCollection({
      schemaVersion: 1,
      themes: [
        {
          id: 'custom-id',
          name: 'Imported',
          baseTheme: 'light',
          tokens: { accent: '#abcdef', bg: 'url(evil)' },
        },
      ],
    });
    expect(parsed.themes[0].tokens.accent).toBe('#abcdef');
    expect(parsed.themes[0].tokens.onAccent).toBe(THEMES.light.onAccent);
    expect(parsed.themes[0].tokens.bg).toBe(THEMES.light.bg);
    expect(parsed.themes[0].tokens.text).toBe(THEMES.light.text);
  });

  it('CSS注入や範囲外の色値を受け付けない', () => {
    const parsed = parseCustomThemeCollection({
      schemaVersion: 1,
      themes: [
        {
          id: 'unsafe-id',
          name: 'Unsafe',
          baseTheme: 'dark',
          tokens: { bg: '#fff;display:none', accent: 'rgb(999,0,0)' },
        },
      ],
    });
    expect(parsed.themes[0].tokens.bg).toBe(THEMES.dark.bg);
    expect(parsed.themes[0].tokens.accent).toBe(THEMES.dark.accent);
  });
});

describe('theme contrast', () => {
  it('全組み込みテーマでアクセント面の前景色がAAコントラストを満たす', () => {
    for (const tokens of Object.values(THEMES)) {
      expect(contrastRatio(tokens.onAccent, tokens.accent)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
