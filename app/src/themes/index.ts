/**
 * テーマ管理モジュール。
 * CSS カスタムプロパティの生成と、ポータル全体へのテーマ適用を担う。
 */

import { THEMES, DEFAULT_THEME } from './definitions';
import type { ThemeTokens } from './theme-tokens';

export { THEMES, DEFAULT_THEME, type ThemeTokens };

// ─── CSS 生成 ─────────────────────────────────────────────────────────────

/** ThemeTokens → #portal-overlay スコープの CSS 変数文字列 */
export function getThemeCss(t: ThemeTokens): string {
  return `#portal-overlay{`
    + `--p-bg:${t.bg};--p-bg2:${t.bgSecondary};--p-bg3:${t.bgTertiary};--p-bg-hover:${t.bgHover};`
    + `--p-border:${t.border};--p-border-light:${t.borderLight};--p-border-hover:${t.borderHover};`
    + `--p-text:${t.text};--p-text-muted:${t.textMuted};--p-text-dim:${t.textDim};`
    + `--p-text-dimmer:${t.textDimmer};--p-text-bright:${t.textBright};`
    + `--p-accent:${t.accent};--p-accent-light:${t.accentLight};`
    + `--p-accent-bg:${t.accentBg};--p-accent-border:${t.accentBorder};`
    + `--p-danger:${t.danger};--p-danger-hover:${t.dangerHover};`
    + `--p-shadow:${t.shadow};--p-shadow-strong:${t.shadowStrong}}`;
}

export function themeTokensForName(name: string): ThemeTokens {
  return THEMES[name] ?? THEMES[DEFAULT_THEME];
}

/** #portal-theme-vars 全文（#portal-overlay 変数 + 初期ビューポート背景） */
export function portalHeadThemeCss(t: ThemeTokens): string {
  return `${getThemeCss(t)}html{background-color:${t.bg}!important}`;
}

export function portalHeadThemeCssByName(name: string): string {
  const key = name.trim();
  return portalHeadThemeCss(themeTokensForName(key || DEFAULT_THEME));
}

/** 起動カバーの背景色（テーマが確定するまでのフラッシュ防止） */
export function bootCoverBg(themeName?: string): string {
  return (THEMES[themeName ?? ''] ?? THEMES[DEFAULT_THEME]).bg;
}

// ─── テーマ適用 ────────────────────────────────────────────────────────────

/**
 * #portal-overlay 要素の style に CSS 変数を直接書き込む。
 * <style> タグ経由よりも参照ズレが起きにくく、ライブ更新に強い。
 */
export function applyThemeToElement(el: HTMLElement, t: ThemeTokens): void {
  el.style.setProperty('--p-bg',           t.bg);
  el.style.setProperty('--p-bg2',          t.bgSecondary);
  el.style.setProperty('--p-bg3',          t.bgTertiary);
  el.style.setProperty('--p-bg-hover',     t.bgHover);
  el.style.setProperty('--p-border',       t.border);
  el.style.setProperty('--p-border-light', t.borderLight);
  el.style.setProperty('--p-border-hover', t.borderHover);
  el.style.setProperty('--p-text',         t.text);
  el.style.setProperty('--p-text-muted',   t.textMuted);
  el.style.setProperty('--p-text-dim',     t.textDim);
  el.style.setProperty('--p-text-dimmer',  t.textDimmer);
  el.style.setProperty('--p-text-bright',  t.textBright);
  el.style.setProperty('--p-accent',       t.accent);
  el.style.setProperty('--p-accent-light', t.accentLight);
  el.style.setProperty('--p-accent-bg',    t.accentBg);
  el.style.setProperty('--p-accent-border',t.accentBorder);
  el.style.setProperty('--p-danger',       t.danger);
  el.style.setProperty('--p-danger-hover', t.dangerHover);
  el.style.setProperty('--p-shadow',       t.shadow);
  el.style.setProperty('--p-shadow-strong',t.shadowStrong);
}

/**
 * head の #portal-theme-vars と #portal-overlay の両方にテーマを反映する。
 * React マウント前後でも同じ関数で適用できる。
 */
export function syncPortalTheme(name: string): void {
  const t   = themeTokensForName(name);
  const styleEl = document.getElementById('portal-theme-vars');
  if (styleEl) styleEl.textContent = portalHeadThemeCss(t);
  const overlay = document.getElementById('portal-overlay') as HTMLElement | null;
  if (overlay) applyThemeToElement(overlay, t);
}
