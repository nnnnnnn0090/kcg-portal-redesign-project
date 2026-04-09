/**
 * core/storage.js — 拡張機能ストレージ抽象化
 *
 * ロード順: document_idle（core/constants.js の後）。
 *
 * Chrome（Manifest V3）と Firefox（browser.storage.local）の
 * API 差異を吸収して、Promise ベースの統一インターフェースを提供する。
 *
 * どちらの API も使えない場合は空オブジェクトを返す（フォールバック）。
 *
 * 公開: P.storage.get(keys), P.storage.set(obj)
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // ────────────────────────────────────────────
  // storage 抽象化オブジェクト
  // ────────────────────────────────────────────

  const storage = {

    /**
     * 指定キー（または複数キー）の値を storage から取得する。
     *
     * @param {string | string[]} keys - 取得するキー、または配列
     * @returns {Promise<Record<string, unknown>>}
     */
    get(keys) {
      return new Promise((resolve) => {
        // Firefox: Promise ベース
        try {
          if (typeof browser !== 'undefined' && browser.storage?.local) {
            browser.storage.local.get(keys).then(resolve).catch(() => resolve({}));
            return;
          }
        } catch (e) {}

        // Chrome / Edge: コールバックベース
        try {
          if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            chrome.storage.local.get(keys, (result) => resolve(result || {}));
            return;
          }
        } catch (e) {}

        // フォールバック（どちらも使えない場合）
        resolve({});
      });
    },

    /**
     * オブジェクトを storage に保存する。
     *
     * @param {Record<string, unknown>} obj - 保存するキーと値のペア
     * @returns {Promise<void>}
     */
    set(obj) {
      return new Promise((resolve) => {
        // Firefox
        try {
          if (typeof browser !== 'undefined' && browser.storage?.local) {
            browser.storage.local.set(obj).then(resolve).catch(resolve);
            return;
          }
        } catch (e) {}

        // Chrome / Edge
        try {
          if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            chrome.storage.local.set(obj, resolve);
            return;
          }
        } catch (e) {}

        resolve();
      });
    },
  };

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  P.storage = storage;

})(typeof globalThis !== 'undefined' ? globalThis : window);
