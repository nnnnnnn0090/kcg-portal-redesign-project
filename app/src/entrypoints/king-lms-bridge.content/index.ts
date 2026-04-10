/**
 * king-lms-bridge.content — King LMS ストレージブリッジ（隔離ワールド、document_start）
 *
 * King LMS ページで動作し、MAIN world フックからのデータを受け取って
 * chrome.storage.local に保存し、同期フロー完了後にポータルへリダイレクトして戻る。
 * location.hash に結果種別を付与することでポータル側にトースト表示を促す。
 */

import { SK, SYNC_HASH } from '../../shared/constants';
import storage from '../../lib/storage';

export default defineContentScript({
  matches: ['https://king-lms.kcg.edu/*'],
  runAt: 'document_start',

  main() {
    scheduleInit();
    installMessageListener();
  },
});

// ─── タイムアウト ─────────────────────────────────────────────────────────────

const SYNC_SAFETY_MS = 120000;  // 2 分

let assignmentSyncTimer: ReturnType<typeof setTimeout> | null = null;
let courseSyncTimer:     ReturnType<typeof setTimeout> | null = null;

function clearAssignmentTimer(): void {
  if (assignmentSyncTimer != null) { clearTimeout(assignmentSyncTimer); assignmentSyncTimer = null; }
}
function clearCourseTimer(): void {
  if (courseSyncTimer != null) { clearTimeout(courseSyncTimer); courseSyncTimer = null; }
}

function startAssignmentTimer(): void {
  clearAssignmentTimer();
  assignmentSyncTimer = setTimeout(async () => {
    assignmentSyncTimer = null;
    const d = await storage.get(SK.kingLmsAssignmentSyncPending);
    if (!d[SK.kingLmsAssignmentSyncPending]) return;
    removeSyncOverlay();
    await redirectAfterAssignment(SYNC_HASH.assignmentTimeout);
  }, SYNC_SAFETY_MS);
}

function startCourseTimer(): void {
  clearCourseTimer();
  courseSyncTimer = setTimeout(async () => {
    courseSyncTimer = null;
    const d = await storage.get(SK.kingLmsSyncPending);
    if (!d[SK.kingLmsSyncPending]) return;
    removeSyncOverlay();
    await redirectAfterCourse(SYNC_HASH.courseTimeout);
  }, SYNC_SAFETY_MS);
}

// ─── スクロールロック ─────────────────────────────────────────────────────────

let scrollLocked     = false;
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

// ─── UI スタイル / オーバーレイ ───────────────────────────────────────────────

const OVERLAY_ID    = 'kcg-portal-ext-sync-overlay';
const LOGIN_HINT_ID = 'kcg-portal-ext-login-hint';
const STYLE_ID      = 'kcg-portal-ext-sync-overlay-style';

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

function mountSyncOverlay(message = 'コース一覧を保存しています…'): void {
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

function removeSyncOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  unlockScroll();
}

function removeLoginHint(): void {
  document.getElementById(LOGIN_HINT_ID)?.remove();
}

function mountLoginHint(isAssignment: boolean): void {
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

// ─── URL ヘルパー ─────────────────────────────────────────────────────────────

function isLoginRedirectPage(): boolean {
  try {
    if (location.hostname !== 'king-lms.kcg.edu') return false;
    const path = location.pathname ?? '';
    if (path !== '/' && path !== '') return false;
    return new URLSearchParams(location.search).has('new_loc');
  } catch { return false; }
}

function isCoursePage(): boolean {
  try { return location.hostname === 'king-lms.kcg.edu' && /\/ultra\/course/.test(location.pathname); }
  catch { return false; }
}

function isStreamPage(): boolean {
  try { return location.hostname === 'king-lms.kcg.edu' && /\/ultra\/stream/.test(location.pathname); }
  catch { return false; }
}

function buildRedirectUrl(base: string, hash: string): string {
  try {
    const u = new URL(base);
    u.hash = hash;
    return u.href;
  } catch {
    return base.split('#')[0] + '#' + hash;
  }
}

// ─── リダイレクト ─────────────────────────────────────────────────────────────

async function redirectAfterCourse(hash: string): Promise<void> {
  clearCourseTimer();
  const data = await storage.get([SK.kingLmsSyncPending, SK.kingLmsSyncReturnUrl]);
  if (!data[SK.kingLmsSyncPending]) return;
  const url = String(data[SK.kingLmsSyncReturnUrl] ?? '');
  if (!url) return;
  await storage.set({
    [SK.kingLmsSyncPending]:    false,
    [SK.kingLmsSyncReturnUrl]:  '',
    [SK.kingLmsSyncAwaitCourse]: false,
  });
  window.location.href = buildRedirectUrl(url, hash);
}

async function redirectAfterAssignment(hash: string): Promise<void> {
  clearAssignmentTimer();
  const data = await storage.get([SK.kingLmsAssignmentSyncPending, SK.kingLmsAssignmentSyncReturnUrl]);
  if (!data[SK.kingLmsAssignmentSyncPending]) return;
  const url = String(data[SK.kingLmsAssignmentSyncReturnUrl] ?? '');
  if (!url) return;
  await storage.set({
    [SK.kingLmsAssignmentSyncPending]:   false,
    [SK.kingLmsAssignmentSyncReturnUrl]: '',
  });
  window.location.href = buildRedirectUrl(url, hash);
}

// ─── 同期フロー ───────────────────────────────────────────────────────────────

async function maybeShowOverlayFromStorage(): Promise<void> {
  const data = await storage.get([
    SK.kingLmsSyncPending,
    SK.kingLmsAssignmentSyncPending,
    SK.kingLmsAssignmentSyncAwaitStream,
    SK.kingLmsAssignmentSyncReturnUrl,
  ]);
  if (data[SK.kingLmsAssignmentSyncPending]) {
    mountSyncOverlay('課題を取得しています…');
    startAssignmentTimer();
  } else if (data[SK.kingLmsAssignmentSyncAwaitStream] && data[SK.kingLmsAssignmentSyncReturnUrl] && isStreamPage()) {
    mountSyncOverlay('課題を取得しています…');
    startAssignmentTimer();
  } else if (data[SK.kingLmsSyncPending]) {
    mountSyncOverlay();
    startCourseTimer();
  }
}

async function cancelPendingForLoginRedirect(): Promise<void> {
  clearAssignmentTimer();
  clearCourseTimer();
  removeSyncOverlay();
  const data = await storage.get([SK.kingLmsSyncReturnUrl, SK.kingLmsAssignmentSyncReturnUrl]);
  const hadCourseReturn     = typeof data[SK.kingLmsSyncReturnUrl]             === 'string' && !!data[SK.kingLmsSyncReturnUrl];
  const hadAssignmentReturn = typeof data[SK.kingLmsAssignmentSyncReturnUrl]   === 'string' && !!data[SK.kingLmsAssignmentSyncReturnUrl];
  await storage.set({
    [SK.kingLmsSyncPending]:               false,
    [SK.kingLmsSyncAwaitCourse]:           hadCourseReturn,
    [SK.kingLmsAssignmentSyncPending]:     false,
    [SK.kingLmsAssignmentSyncAwaitStream]: hadAssignmentReturn,
  });
  if (hadCourseReturn || hadAssignmentReturn) {
    mountLoginHint(hadAssignmentReturn && !hadCourseReturn);
  }
}

async function saveCourses(courses: unknown[]): Promise<void> {
  if (isLoginRedirectPage()) { await cancelPendingForLoginRedirect(); return; }
  const data = await storage.get([SK.kingLmsSyncPending, SK.kingLmsSyncAwaitCourse, SK.kingLmsSyncReturnUrl]);
  let syncPending = !!data[SK.kingLmsSyncPending];
  const hadAwait  = !!data[SK.kingLmsSyncAwaitCourse];
  // AwaitCourse フラグ（ログイン後に戻ったケース）でも同期を継続する
  if (!syncPending && hadAwait && data[SK.kingLmsSyncReturnUrl] && isCoursePage()) syncPending = true;
  if (syncPending) mountSyncOverlay();
  const toSet: Record<string, unknown> = { [SK.kingLmsCourses]: courses };
  if (syncPending && hadAwait) { toSet[SK.kingLmsSyncAwaitCourse] = false; toSet[SK.kingLmsSyncPending] = true; }
  await storage.set(toSet);
  if (syncPending) await redirectAfterCourse(SYNC_HASH.courseDone);
}

async function saveAssignmentDue(items: unknown[], capturedAt: number, captureState?: string): Promise<void> {
  const data = await storage.get([SK.kingLmsAssignmentSyncPending, SK.kingLmsAssignmentSyncAwaitStream, SK.kingLmsAssignmentSyncReturnUrl]);
  let syncPending = !!data[SK.kingLmsAssignmentSyncPending];
  const hadAwait  = !!data[SK.kingLmsAssignmentSyncAwaitStream];
  if (!syncPending && hadAwait && data[SK.kingLmsAssignmentSyncReturnUrl] && isStreamPage()) syncPending = true;
  if (syncPending) mountSyncOverlay('課題を取得しています…');

  if (captureState === 'error') {
    if (syncPending) {
      const errSet: Record<string, unknown> = {};
      if (hadAwait) { errSet[SK.kingLmsAssignmentSyncAwaitStream] = false; errSet[SK.kingLmsAssignmentSyncPending] = true; }
      await storage.set(errSet);
      await redirectAfterAssignment(SYNC_HASH.assignmentError);
    }
    return;
  }

  const toSet: Record<string, unknown> = { [SK.kingLmsStreamsUltraDue]: { items, capturedAt } };
  if (syncPending && hadAwait) { toSet[SK.kingLmsAssignmentSyncAwaitStream] = false; toSet[SK.kingLmsAssignmentSyncPending] = true; }
  await storage.set(toSet);
  if (syncPending) await redirectAfterAssignment(SYNC_HASH.assignmentDone);
}

// ─── 起動 ─────────────────────────────────────────────────────────────────────

function scheduleInit(): void {
  function run(): void {
    if (isLoginRedirectPage()) { cancelPendingForLoginRedirect(); return; }
    maybeShowOverlayFromStorage();
  }
  if (document.body) run();
  else document.addEventListener('DOMContentLoaded', run, { once: true });
}

function installMessageListener(): void {
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (e.origin !== 'https://king-lms.kcg.edu') return;
    if (!e.data) return;

    if (e.data.type === 'portalThemeKingLmsSyncAbort' && e.data.source === 'portalThemeKingLmsHook') {
      cancelPendingForLoginRedirect();
      return;
    }

    if (e.data.type === 'portalThemeKingLmsStreamsUltraDue' && e.data.source === 'portalThemeKingLmsHook') {
      if (e.data.captureState === 'error') { saveAssignmentDue([], Date.now(), 'error'); return; }
      if (!Array.isArray(e.data.items)) return;
      const capturedAt = typeof e.data.capturedAt === 'number' ? e.data.capturedAt : Date.now();
      saveAssignmentDue(e.data.items, capturedAt);
      return;
    }

    if (e.data.type === 'portalThemeKingLmsCourses' && e.data.source === 'portalThemeKingLmsHook') {
      if (!Array.isArray(e.data.courses)) return;
      saveCourses(e.data.courses);
    }
  });
}
