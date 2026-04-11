/**
 * 同期中オーバーレイ・ログインヒント・スクロールロック。
 */

import { isLoginRedirectPage } from './bridge-urls';

const OVERLAY_ID    = 'kcg-portal-ext-sync-overlay';
const LOGIN_HINT_ID = 'kcg-portal-ext-login-hint';
const STYLE_ID      = 'kcg-portal-ext-sync-overlay-style';

let scrollLocked      = false;
let savedHtmlOverflow = '';
let savedBodyOverflow = '';

function lockScroll(): void {
  if (scrollLocked) return;
  scrollLocked = true;
  savedHtmlOverflow = document.documentElement.style.overflow;
  savedBodyOverflow = document.body?.style.overflow ?? '';
  document.documentElement.style.overflow = 'hidden';
  if (document.body) document.body.style.overflow = 'hidden';
}

function unlockScroll(): void {
  if (!scrollLocked) return;
  scrollLocked = false;
  document.documentElement.style.overflow = savedHtmlOverflow;
  if (document.body) document.body.style.overflow = savedBodyOverflow;
}

function ensureUiStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent =
    '@keyframes kcg-portal-ext-spin{to{transform:rotate(360deg)}}' +
    `#${OVERLAY_ID},#${OVERLAY_ID} *{box-sizing:border-box}` +
    `#${LOGIN_HINT_ID},#${LOGIN_HINT_ID} *{box-sizing:border-box}` +
    `#${OVERLAY_ID}{` +
      'position:fixed;inset:0;z-index:2147483647;' +
      'display:flex;align-items:center;justify-content:center;' +
      'background:rgba(15,23,42,0.9);backdrop-filter:blur(8px);' +
      '-webkit-backdrop-filter:blur(8px);font-family:system-ui,-apple-system,sans-serif}' +
    `#${OVERLAY_ID} .kcg-portal-ext-sync-inner{` +
      'display:flex;flex-direction:column;align-items:center;gap:1.25rem;' +
      'text-align:center;padding:2rem}' +
    `#${OVERLAY_ID} .kcg-portal-ext-sync-spinner{` +
      'width:48px;height:48px;border-radius:50%;flex-shrink:0;' +
      'border:4px solid rgba(255,255,255,0.2);border-top-color:#38bdf8;' +
      'animation:kcg-portal-ext-spin 0.75s linear infinite}' +
    `#${OVERLAY_ID} .kcg-portal-ext-sync-msg{` +
      'color:#e2e8f0;font-size:1rem;font-weight:500;margin:0;line-height:1.5}' +
    `#${LOGIN_HINT_ID}{` +
      'position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
      'padding:.75rem 1rem;background:rgba(15,23,42,0.95);' +
      'border-bottom:1px solid rgba(148,163,184,0.35);' +
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
      'font-family:system-ui,-apple-system,sans-serif;' +
      'pointer-events:none;box-shadow:0 4px 24px rgba(0,0,0,0.12)}' +
    `#${LOGIN_HINT_ID} .kcg-portal-ext-login-hint-msg{` +
      'margin:0;text-align:center;color:#f1f5f9;font-size:.9375rem;font-weight:600;line-height:1.45}' +
    `#${LOGIN_HINT_ID} .kcg-portal-ext-login-hint-sub{` +
      'margin:.35rem 0 0;text-align:center;color:#94a3b8;font-size:.8125rem;font-weight:400;line-height:1.4}';
  (document.head ?? document.documentElement).appendChild(style);
}

export function mountSyncOverlay(message = 'コース一覧を保存しています…'): void {
  if (document.getElementById(OVERLAY_ID)) return;
  removeLoginHint();
  lockScroll();
  ensureUiStyles();
  const root = document.createElement('div');
  root.id = OVERLAY_ID;
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  root.innerHTML =
    '<div class="kcg-portal-ext-sync-inner">' +
      '<div class="kcg-portal-ext-sync-spinner" aria-hidden="true"></div>' +
      `<p class="kcg-portal-ext-sync-msg">${message}</p>` +
    '</div>';
  (document.body ?? document.documentElement).appendChild(root);
}

export function removeSyncOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  unlockScroll();
}

function removeLoginHint(): void {
  document.getElementById(LOGIN_HINT_ID)?.remove();
}

export function mountLoginHint(isAssignment: boolean): void {
  if (!isLoginRedirectPage()) return;
  ensureUiStyles();
  if (document.getElementById(LOGIN_HINT_ID)) return;
  const sub = isAssignment
    ? 'ログイン後、課題を取得してポータルに戻ります。'
    : 'ログイン後、コース一覧を保存してポータルに戻ります。';
  const bar = document.createElement('div');
  bar.id = LOGIN_HINT_ID;
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  bar.innerHTML =
    '<p class="kcg-portal-ext-login-hint-msg">ログインしてください</p>' +
    `<p class="kcg-portal-ext-login-hint-sub">${sub}</p>`;
  (document.body ?? document.documentElement).appendChild(bar);
}
