/**
 * テーマ管理モジュールです。
 * CSS カスタムプロパティ文字列の生成と、`#portal-overlay` への適用を担います。
 */

import { PORTAL_DOM } from '../shared/constants';
import { THEMES, DEFAULT_THEME } from './definitions';
import type { ThemeTokens } from './theme-tokens';

export { THEMES, DEFAULT_THEME, type ThemeTokens };

// ─── CSS 生成 ─────────────────────────────────────────────────────────────

/** テーマトークンを `#portal-overlay` スコープ用の CSS カスタムプロパティ文字列へ変換します。 */
export function getThemeCss(t: ThemeTokens): string {
  return `#${PORTAL_DOM.overlayRoot}{`
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

/** オーバーレイ用変数に加え、`html` の初期背景色まで含めた先頭注入用 CSS 文字列です。 */
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

const PORTAL_BACKDROP_Z = 2147483646;

/**
 * オーバーレイ直下の固定背景。オーバースクロールのバウンド時にホストページが見えないようにする。
 * 起動時のブートカバー（`#kcg-portal-boot-cover`）をマウント後も残して使う。
 */
export function ensurePortalBackdrop(themeName?: string): void {
  const bg = bootCoverBg(themeName);
  const overlay = document.getElementById(PORTAL_DOM.overlayRoot);
  let el = document.getElementById(PORTAL_DOM.bootCover) as HTMLElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = PORTAL_DOM.bootCover;
    el.setAttribute('aria-hidden', 'true');
  }
  el.style.position = 'fixed';
  el.style.inset = '0';
  el.style.zIndex = String(PORTAL_BACKDROP_Z);
  el.style.pointerEvents = 'none';
  el.style.margin = '0';
  el.style.padding = '0';
  el.style.border = '0';
  el.style.width = '100%';
  el.style.height = '100%';
  el.style.background = bg;

  const parent = document.body ?? document.documentElement;
  if (overlay?.parentElement === parent) {
    parent.insertBefore(el, overlay);
  } else if (!el.parentElement) {
    parent.appendChild(el);
  }
}

export function removePortalBackdrop(): void {
  document.getElementById(PORTAL_DOM.bootCover)?.remove();
}

/** 固定シェル `#portal-overlay` と、その内側スクロール容器を body に追加する */
export function appendPortalOverlayShell(): { overlay: HTMLElement; scroller: HTMLElement } {
  const overlay = document.createElement('div');
  overlay.id = PORTAL_DOM.overlayRoot;
  const scroller = document.createElement('div');
  scroller.className = 'p-overlay-scroller';
  overlay.appendChild(scroller);
  document.body.appendChild(overlay);
  return { overlay, scroller };
}

function syncDocumentSurfaceBg(bg: string): void {
  document.documentElement.style.backgroundColor = bg;
  document.body.style.backgroundColor = bg;
}

// ─── テーマ適用 ────────────────────────────────────────────────────────────

/**
 * `#portal-overlay` の `style` に CSS 変数を直接書き込みます。
 * `<style>` 注入より参照のズレが起きにくく、テーマのライブ切替にも向きます。
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
 * `head` 内の `#portal-theme-vars` と `#portal-overlay` の両方へテーマを反映します。
 * React のマウント前後を問わず同じ関数で呼べます。
 */
export function syncPortalTheme(name: string): void {
  const t   = themeTokensForName(name);
  const styleEl = document.getElementById(PORTAL_DOM.headThemeStyle);
  if (styleEl) styleEl.textContent = portalHeadThemeCss(t);
  const overlay = document.getElementById(PORTAL_DOM.overlayRoot) as HTMLElement | null;
  if (overlay) {
    applyThemeToElement(overlay, t);
    overlay.style.background = t.bg;
  }
  syncDocumentSurfaceBg(t.bg);
  ensurePortalBackdrop(name);
}
