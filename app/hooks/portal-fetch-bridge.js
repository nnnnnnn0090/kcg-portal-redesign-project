/**
 * hooks/portal-fetch-bridge.js — 再フェッチブリッジ（MAIN world）
 *
 * ロード順: document_start、MAIN world、portal-fetch-hook.js の直後。
 *
 * 役割:
 *   隔離ワールドの api/urls.js から postMessage で送られる
 *   'portalThemePageFetchRequest' を受け取り、ページのコンテキスト（MAIN world）で
 *   認証ヘッダー付き fetch を実行する。
 *
 * なぜ必要か:
 *   隔離ワールドのコンテンツスクリプトは拡張機能コンテキストで動くため、
 *   ポータルの認証ヘッダー（X-CPAuthorize 等）を直接付与できない。
 *   portal-fetch-hook.js がキャプチャしたヘッダーを window.__portalCapturedApiHeaders
 *   に保存し、このスクリプトがそれを使って再フェッチする。
 *
 * リトライ:
 *   X-CPAuthorize が取得できていない場合は最大 15 秒・10 回まで待機してリトライする。
 */
(function () {
  'use strict';

  // ────────────────────────────────────────────
  // デフォルトリクエストヘッダー
  // ────────────────────────────────────────────

  var BASE_HEADERS = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Requested-With': 'XMLHttpRequest',
  };

  function hasCpAuthorize() {
    var cap = window.__portalCapturedApiHeaders;
    if (!cap) return false;
    for (var k in cap) {
      if (Object.prototype.hasOwnProperty.call(cap, k) && k.toLowerCase() === 'x-cpauthorize' && cap[k]) {
        return true;
      }
    }
    return false;
  }

  /**
   * 認証ヘッダー付き fetch を実行する。
   * 401 が返ってきた場合は指数バックオフでリトライする。
   *
   * @param {string} url
   * @param {number} attempt - 0 始まり
   */
  function doFetch(url, attempt) {
    var cap = window.__portalCapturedApiHeaders || {};
    var headers = Object.assign({}, BASE_HEADERS, cap);
    fetch(url, { credentials: 'include', cache: 'no-store', headers: headers })
      .then(function (response) {
        if (response.status === 401 && attempt < 10) {
          var delay = Math.min(100 + attempt * 200, 2200);
          setTimeout(function () { doFetch(url, attempt + 1); }, delay);
        }
      })
      .catch(function () {});
  }

  /**
   * X-CPAuthorize が取得できるまで待機してからフェッチする。
   * 15 秒経過したら諦めて実行する。
   *
   * @param {string} url
   */
  function waitAndFetch(url) {
    var deadline = Date.now() + 15000;
    function check() {
      if (hasCpAuthorize() || Date.now() >= deadline) {
        doFetch(url, 0);
        return;
      }
      setTimeout(check, 40);
    }
    check();
  }

  // ────────────────────────────────────────────
  // メッセージリスナー
  // ────────────────────────────────────────────

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'portalThemePageFetchRequest') return;
    if (e.source !== window) return;
    var url = e.data.url;
    if (!url) return;
    waitAndFetch(String(url));
  });

})();
