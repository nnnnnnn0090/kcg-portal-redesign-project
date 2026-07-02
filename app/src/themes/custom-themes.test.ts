import { describe, expect, it } from 'vitest';
import { THEMES } from './definitions';
import {
  autoFixThemeContrast,
  contrastRatio,
  createCustomTheme,
  customThemeRef,
  editableTokens,
  parseCustomThemeCollection,
  resolveThemeTokens,
  themeContrastIssues,
} from './custom-themes';

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
  it('半透明色を含むコントラスト比を計算する', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21);
    expect(contrastRatio('rgba(255,255,255,.5)', '#000000')).toBeGreaterThan(5);
  });

  it('読みにくい主要色を検出して自動補正する', () => {
    const tokens = editableTokens(THEMES.light);
    tokens.text = '#fafafa';
    expect(themeContrastIssues(tokens)).toContain('text');
    expect(themeContrastIssues(autoFixThemeContrast(tokens))).not.toContain('text');
  });
});
