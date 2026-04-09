/**
 * bridges/king-lms-bridge.js — King LMS ストレージブリッジ（隔離ワールド）
 *
 * ロード順: document_start、隔離ワールド、https://king-lms.kcg.edu/* のみ。
 *
 * 役割:
 *   MAIN world の hooks/king-lms-fetch-hook.js から postMessage で受け取った
 *   コース一覧を extension storage に保存し、
 *   同期フラグが立っていればポータルへリダイレクトして戻る。
 *
 * 同期フロー:
 *   1. ユーザーが設定で「King LMS リンク」をオンにする
 *      → storage に { kingLmsSyncPending: true, kingLmsSyncReturnUrl: <portal URL> } を書く
 *      → https://king-lms.kcg.edu/ultra/course へリダイレクト
 *   2. このブリッジが pending を検知してオーバーレイを表示する
 *   3. King LMS が memberships を取得すると hooks/king-lms-fetch-hook.js が postMessage を送る
 *   4. このブリッジがコースを storage に保存し、returnUrl + #portal-king-lms-sync-ok へリダイレクトして戻る
 *
 *   streams/ultra の期日付き slim 配列もフックから届いたら storage に保存する。
 *   課題同期（assignmentSyncPending）が立っていれば保存後にポータルへリダイレクトして戻る。
 *   フックが反応しない・空応答が続く場合はタイムアウトで pending を解除しポータルへ戻す。
 *
 * ログインリダイレクト:
 *   King LMS がログインページへ飛ばした場合、pending を解除して awaitCourse フラグを立てる。
 *   ポータルからの同期（returnUrl あり）のときは画面上部に「ログインしてください」バナーを出す（フォームは操作可）。
 *   その後、コース画面で memberships が取得されたら pending に戻して戻る。
 */
(function () {
  'use strict';

  // ────────────────────────────────────────────
  // ストレージキー（core/constants.js SK と同一の文字列を使う）
  // ────────────────────────────────────────────

  var KEY_COURSES        = 'portalThemeKingLmsCourses';
  var KEY_STREAMS_DUE    = 'portalThemeKingLmsStreamsUltraDue';
  var KEY_PENDING        = 'portalThemeKingLmsSyncPending';
  var KEY_RETURN_URL     = 'portalThemeKingLmsSyncReturnUrl';
  var KEY_AWAIT_COURSE   = 'portalThemeKingLmsSyncAwaitCourse';

  var KEY_ASSIGNMENT_PENDING    = 'portalThemeKingLmsAssignmentSyncPending';
  var KEY_ASSIGNMENT_RETURN_URL = 'portalThemeKingLmsAssignmentSyncReturnUrl';

  var SYNC_DONE_HASH               = 'portal-king-lms-sync-ok';
  var SYNC_TIMEOUT_HASH            = 'portal-king-lms-sync-timeout';
  var ASSIGNMENT_SYNC_DONE_HASH    = 'portal-king-lms-assignment-sync-ok';
  var ASSIGNMENT_SYNC_TIMEOUT_HASH = 'portal-king-lms-assignment-sync-timeout';
  var ASSIGNMENT_SYNC_ERROR_HASH   = 'portal-king-lms-assignment-sync-error';

  /** 取得フローでフックが反応しない・空応答が続く場合にポータルへ戻すまでの時間（ms） */
  var ASSIGNMENT_SYNC_SAFETY_MS = 120000;
  var COURSE_SYNC_SAFETY_MS     = 120000;

  // オーバーレイ要素 ID
  var OVERLAY_ID     = 'kcg-portal-ext-sync-overlay';
  var LOGIN_HINT_ID  = 'kcg-portal-ext-login-hint';
  var STYLE_ID       = 'kcg-portal-ext-sync-overlay-style';

  // スクロールロック状態を追跡する変数
  var scrollLocked       = false;
  var savedHtmlOverflow  = '';
  var savedBodyOverflow  = '';

  var assignmentSyncSafetyTimer = null;
  var courseSyncSafetyTimer     = null;

  function clearAssignmentSyncSafetyTimer() {
    if (assignmentSyncSafetyTimer != null) {
      clearTimeout(assignmentSyncSafetyTimer);
      assignmentSyncSafetyTimer = null;
    }
  }

  function clearCourseSyncSafetyTimer() {
    if (courseSyncSafetyTimer != null) {
      clearTimeout(courseSyncSafetyTimer);
      courseSyncSafetyTimer = null;
    }
  }

  function startAssignmentSyncSafetyTimer() {
    clearAssignmentSyncSafetyTimer();
    assignmentSyncSafetyTimer = setTimeout(function () {
      assignmentSyncSafetyTimer = null;
      storageGet(KEY_ASSIGNMENT_PENDING, function (d) {
        if (!d || !d[KEY_ASSIGNMENT_PENDING]) return;
        removeSyncOverlay();
        redirectToPortalAfterAssignmentSync(ASSIGNMENT_SYNC_TIMEOUT_HASH);
      });
    }, ASSIGNMENT_SYNC_SAFETY_MS);
  }

  function startCourseSyncSafetyTimer() {
    clearCourseSyncSafetyTimer();
    courseSyncSafetyTimer = setTimeout(function () {
      courseSyncSafetyTimer = null;
      storageGet(KEY_PENDING, function (d) {
        if (!d || !d[KEY_PENDING]) return;
        removeSyncOverlay();
        redirectAfterSyncWithHash(SYNC_TIMEOUT_HASH);
      });
    }, COURSE_SYNC_SAFETY_MS);
  }

  // ────────────────────────────────────────────
  // ストレージ抽象化（Chrome / Firefox 両対応）
  // ────────────────────────────────────────────

  function storageGet(keys, callback) {
    var ks = Array.isArray(keys) ? keys : [keys];
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(ks, function (data) {
          if (chrome.runtime && chrome.runtime.lastError) { callback(null); return; }
          callback(data || {});
        });
        return;
      }
    } catch (e) {}
    try {
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        browser.storage.local.get(ks)
          .then(function (data) { callback(data || {}); })
          .catch(function () { callback(null); });
        return;
      }
    } catch (e) {}
    callback(null);
  }

  function storageSet(obj, done) {
    done = done || function () {};
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(obj, function () {
          done(!(chrome.runtime && chrome.runtime.lastError));
        });
        return;
      }
    } catch (e) {}
    try {
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        browser.storage.local.set(obj)
          .then(function () { done(true); })
          .catch(function () { done(false); });
        return;
      }
    } catch (e) {}
    done(false);
  }

  // ────────────────────────────────────────────
  // スクロールロック（オーバーレイ表示中にバックグラウンドをスクロールさせない）
  // ────────────────────────────────────────────

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    var de = document.documentElement;
    var b  = document.body;
    if (de) { savedHtmlOverflow = de.style.overflow; de.style.overflow = 'hidden'; }
    if (b)  { savedBodyOverflow = b.style.overflow;  b.style.overflow  = 'hidden'; }
  }

  function unlockScroll() {
    if (!scrollLocked) return;
    scrollLocked = false;
    var de = document.documentElement;
    var b  = document.body;
    if (de) de.style.overflow = savedHtmlOverflow;
    if (b)  b.style.overflow  = savedBodyOverflow;
  }

  // ────────────────────────────────────────────
  // 同期オーバーレイ・ログインバナー用スタイル
  // ────────────────────────────────────────────

  function ensureUiStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    // クラス名は Ultra 等のグローバルと衝突しないよう接頭辞付きにする
    style.textContent =
      '@keyframes kcg-portal-ext-spin{to{transform:rotate(360deg)}}' +
      '#' + OVERLAY_ID + ',#' + OVERLAY_ID + ' *{box-sizing:border-box}' +
      '#' + LOGIN_HINT_ID + ',#' + LOGIN_HINT_ID + ' *{box-sizing:border-box}' +
      '#' + OVERLAY_ID + '{' +
        'position:fixed;inset:0;z-index:2147483647;' +
        'display:flex;align-items:center;justify-content:center;' +
        'background:rgba(15,23,42,0.9);backdrop-filter:blur(8px);' +
        '-webkit-backdrop-filter:blur(8px);font-family:system-ui,-apple-system,sans-serif}' +
      '#' + OVERLAY_ID + ' .kcg-portal-ext-sync-inner{' +
        'display:flex;flex-direction:column;align-items:center;gap:1.25rem;' +
        'text-align:center;padding:2rem}' +
      '#' + OVERLAY_ID + ' .kcg-portal-ext-sync-spinner{' +
        'width:48px;height:48px;border-radius:50%;flex-shrink:0;' +
        'border:4px solid rgba(255,255,255,0.2);border-top-color:#38bdf8;' +
        'animation:kcg-portal-ext-spin 0.75s linear infinite}' +
      '#' + OVERLAY_ID + ' .kcg-portal-ext-sync-msg{' +
        'color:#e2e8f0;font-size:1rem;font-weight:500;margin:0;line-height:1.5}' +
      '#' + LOGIN_HINT_ID + '{' +
        'position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
        'padding:.75rem 1rem;' +
        'background:rgba(15,23,42,0.95);' +
        'border-bottom:1px solid rgba(148,163,184,0.35);' +
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
        'font-family:system-ui,-apple-system,sans-serif;' +
        'pointer-events:none;box-shadow:0 4px 24px rgba(0,0,0,0.12)}' +
      '#' + LOGIN_HINT_ID + ' .kcg-portal-ext-login-hint-msg{' +
        'margin:0;text-align:center;color:#f1f5f9;font-size:.9375rem;font-weight:600;line-height:1.45}' +
      '#' + LOGIN_HINT_ID + ' .kcg-portal-ext-login-hint-sub{' +
        'margin:.35rem 0 0;text-align:center;color:#94a3b8;font-size:.8125rem;font-weight:400;line-height:1.4}';
    (document.head || document.documentElement).appendChild(style);
  }

  function removeLoginHint() {
    var hint = document.getElementById(LOGIN_HINT_ID);
    if (hint) hint.remove();
  }

  /** ログイン画面用。ポータルからの同期フローで returnUrl があるときだけ呼ぶ。 */
  function mountLoginHint() {
    if (!isLoginRedirectPage()) return;
    ensureUiStyles();
    if (document.getElementById(LOGIN_HINT_ID)) return;

    var bar = document.createElement('div');
    bar.id = LOGIN_HINT_ID;
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.innerHTML =
      '<p class="kcg-portal-ext-login-hint-msg">ログインしてください</p>' +
      '<p class="kcg-portal-ext-login-hint-sub">ログイン後、コース一覧を保存してポータルに戻ります。</p>';
    (document.body || document.documentElement).appendChild(bar);
  }

  // ────────────────────────────────────────────
  // 同期オーバーレイ（全画面）
  // ────────────────────────────────────────────

  function mountSyncOverlay(message) {
    if (document.getElementById(OVERLAY_ID)) return;
    removeLoginHint();
    lockScroll();
    ensureUiStyles();

    var msg = message || 'コース一覧を保存しています…';
    var root = document.createElement('div');
    root.id = OVERLAY_ID;
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.innerHTML =
      '<div class="kcg-portal-ext-sync-inner">' +
        '<div class="kcg-portal-ext-sync-spinner" aria-hidden="true"></div>' +
        '<p class="kcg-portal-ext-sync-msg">' + msg + '</p>' +
      '</div>';
    (document.body || document.documentElement).appendChild(root);
  }

  function removeSyncOverlay() {
    var el = document.getElementById(OVERLAY_ID);
    if (el) el.remove();
    unlockScroll();
  }

  // ────────────────────────────────────────────
  // URL ヘルパー
  // ────────────────────────────────────────────

  function isLoginRedirectPage() {
    try {
      if (location.hostname !== 'king-lms.kcg.edu') return false;
      var path = location.pathname || '';
      if (path !== '/' && path !== '') return false;
      return new URLSearchParams(location.search).has('new_loc');
    } catch (e) { return false; }
  }

  function isCoursePage() {
    try {
      if (location.hostname !== 'king-lms.kcg.edu') return false;
      return /\/ultra\/course/.test(location.pathname || '');
    } catch (e) { return false; }
  }

  // ────────────────────────────────────────────
  // 同期フロー
  // ────────────────────────────────────────────

  function maybeShowOverlayFromStorage() {
    storageGet([KEY_PENDING, KEY_ASSIGNMENT_PENDING], function (data) {
      if (!data) return;
      if (data[KEY_ASSIGNMENT_PENDING]) {
        mountSyncOverlay('課題を取得しています…');
        startAssignmentSyncSafetyTimer();
      } else if (data[KEY_PENDING]) {
        mountSyncOverlay();
        startCourseSyncSafetyTimer();
      }
    });
  }

  function cancelPendingForLoginRedirect() {
    clearAssignmentSyncSafetyTimer();
    clearCourseSyncSafetyTimer();
    removeSyncOverlay();
    storageGet([KEY_RETURN_URL, KEY_ASSIGNMENT_RETURN_URL], function (data) {
      if (!data) return;
      var returnUrl = data[KEY_RETURN_URL] || data[KEY_ASSIGNMENT_RETURN_URL];
      var hadReturn = !!(returnUrl && typeof returnUrl === 'string');
      var toSet = {};
      toSet[KEY_PENDING]              = false;
      toSet[KEY_AWAIT_COURSE]         = hadReturn;
      toSet[KEY_ASSIGNMENT_PENDING]   = false;
      storageSet(toSet, function () {
        if (hadReturn) mountLoginHint();
      });
    });
  }

  /**
   * コース同期 pending 時にポータルへ戻る。hash は完了・タイムアウトなどで切り替え。
   * @param {string} [hashStr] 省略時は SYNC_DONE_HASH
   */
  function redirectAfterSyncWithHash(hashStr) {
    hashStr = hashStr || SYNC_DONE_HASH;
    clearCourseSyncSafetyTimer();
    storageGet([KEY_PENDING, KEY_RETURN_URL], function (data) {
      if (!data || !data[KEY_PENDING]) return;
      var url = data[KEY_RETURN_URL];
      if (!url || typeof url !== 'string') return;
      var toSet = {};
      toSet[KEY_PENDING]      = false;
      toSet[KEY_RETURN_URL]   = '';
      toSet[KEY_AWAIT_COURSE] = false;
      var dest;
      try {
        var u = new URL(url);
        u.hash = hashStr;
        dest = u.href;
      } catch (ex) {
        dest = String(url).split('#')[0] + '#' + hashStr;
      }
      storageSet(toSet, function (ok) {
        if (ok) window.location.href = dest;
      });
    });
  }

  // コース取得後、storage に保存してポータルへ戻る
  function redirectAfterSync() {
    redirectAfterSyncWithHash(SYNC_DONE_HASH);
  }

  // コース一覧を storage に保存する
  function saveCourses(courses) {
    if (isLoginRedirectPage()) {
      cancelPendingForLoginRedirect();
      return;
    }

    storageGet([KEY_PENDING, KEY_AWAIT_COURSE, KEY_RETURN_URL], function (data) {
      if (!data) return;

      var syncPending = !!data[KEY_PENDING];
      var hadAwait    = !!data[KEY_AWAIT_COURSE];

      // awaitCourse が立っていた場合（ログイン後コース画面に戻ってきた）は pending に戻す
      if (!syncPending && hadAwait && data[KEY_RETURN_URL] && isCoursePage()) {
        syncPending = true;
      }

      if (syncPending) mountSyncOverlay();

      var toSet = {};
      toSet[KEY_COURSES] = courses;
      if (syncPending && hadAwait) {
        toSet[KEY_AWAIT_COURSE] = false;
        toSet[KEY_PENDING]      = true;
      }

      storageSet(toSet, function (ok) {
        if (ok && syncPending) redirectAfterSync();
      });
    });
  }

  // ────────────────────────────────────────────
  // 課題同期: storage に保存し、pending なら戻る
  // ────────────────────────────────────────────

  /** @param {string} hashStr 完了・タイムアウト・エラー用の hash（# なし） */
  function redirectToPortalAfterAssignmentSync(hashStr) {
    clearAssignmentSyncSafetyTimer();
    hashStr = hashStr || ASSIGNMENT_SYNC_DONE_HASH;
    storageGet([KEY_ASSIGNMENT_PENDING, KEY_ASSIGNMENT_RETURN_URL], function (data) {
      if (!data || !data[KEY_ASSIGNMENT_PENDING]) return;
      var url = data[KEY_ASSIGNMENT_RETURN_URL];
      if (!url || typeof url !== 'string') return;
      var toSet = {};
      toSet[KEY_ASSIGNMENT_PENDING]    = false;
      toSet[KEY_ASSIGNMENT_RETURN_URL] = '';
      var dest;
      try {
        var u = new URL(url);
        u.hash = hashStr;
        dest = u.href;
      } catch (ex) {
        dest = String(url).split('#')[0] + '#' + hashStr;
      }
      storageSet(toSet, function (ok) {
        if (ok) window.location.href = dest;
      });
    });
  }

  function redirectAfterAssignmentSync() {
    redirectToPortalAfterAssignmentSync(ASSIGNMENT_SYNC_DONE_HASH);
  }

  /**
   * @param {Array} items
   * @param {number} capturedAt
   * @param {string} [captureState] 'error' のとき既存の課題キャッシュは書き換えずポータルへ戻す
   */
  function saveAssignmentDue(items, capturedAt, captureState) {
    storageGet(KEY_ASSIGNMENT_PENDING, function (data) {
      var syncPending = !!(data && data[KEY_ASSIGNMENT_PENDING]);
      if (syncPending) mountSyncOverlay('課題を取得しています…');

      if (captureState === 'error') {
        redirectToPortalAfterAssignmentSync(ASSIGNMENT_SYNC_ERROR_HASH);
        return;
      }

      var duePayload = { items: items, capturedAt: capturedAt };
      var toSet = {};
      toSet[KEY_STREAMS_DUE] = duePayload;
      storageSet(toSet, function (ok) {
        if (ok && syncPending) redirectAfterAssignmentSync();
      });
    });
  }

  // ────────────────────────────────────────────
  // 起動処理
  // ────────────────────────────────────────────

  function scheduleInit() {
    function run() {
      if (isLoginRedirectPage()) {
        cancelPendingForLoginRedirect();
        return;
      }
      if (document.body) {
        maybeShowOverlayFromStorage();
      } else {
        document.addEventListener('DOMContentLoaded', maybeShowOverlayFromStorage, { once: true });
      }
    }
    if (document.body) run();
    else document.addEventListener('DOMContentLoaded', run, { once: true });
  }

  scheduleInit();

  // ────────────────────────────────────────────
  // メッセージリスナー（MAIN world からのコース一覧 / 中断通知を受け取る）
  // ────────────────────────────────────────────

  window.addEventListener('message', function (e) {
    if (e.source !== window) return;
    if (e.origin !== 'https://king-lms.kcg.edu') return;
    if (!e.data) return;

    // ログインリダイレクト通知
    if (e.data.type === 'portalThemeKingLmsSyncAbort' &&
        e.data.source === 'portalThemeKingLmsHook') {
      cancelPendingForLoginRedirect();
      return;
    }

    // streams/ultra 期日付き slim → storage に保存し、課題同期中ならリダイレクト
    if (e.data.type === 'portalThemeKingLmsStreamsUltraDue' &&
        e.data.source === 'portalThemeKingLmsHook') {
      if (e.data.captureState === 'error') {
        saveAssignmentDue([], Date.now(), 'error');
        return;
      }
      if (!Array.isArray(e.data.items)) return;
      saveAssignmentDue(
        e.data.items,
        typeof e.data.capturedAt === 'number' ? e.data.capturedAt : Date.now(),
      );
      return;
    }

    // コース一覧通知
    if (e.data.type !== 'portalThemeKingLmsCourses' ||
        e.data.source !== 'portalThemeKingLmsHook') return;
    if (!Array.isArray(e.data.courses)) return;
    saveCourses(e.data.courses);
  });

})();
