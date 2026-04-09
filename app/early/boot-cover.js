/**
 * early/boot-cover.js — 起動カバー（フラッシュ防止）
 *
 * ロード順: document_start (隔離ワールド)、theme.js の直後。
 *
 * ポータル本体の HTML が描画される前に全画面カバーを表示し、
 * オーバーレイの描画が完了するまで白フラッシュを防ぐ。
 * テーマ色は THEMES.*.bg のみ使用する（CSS 変数は未適用のため）。
 *
 * boot.js がオーバーレイを DOM に追加した後にカバーを取り除く。
 */
(function () {
  'use strict';

  const P = typeof globalThis !== 'undefined' ? globalThis.P : window.P;
  if (!P || typeof P.bootCoverBg !== 'function' || !P.THEME_STORAGE_KEY) return;

  /**
   * カバー要素を作成または更新して指定色で塗る。
   * @param {string} color - CSS 背景色
   */
  function paint(color) {
    let el = document.getElementById('kcg-portal-boot-cover');
    if (!el) {
      el = document.createElement('div');
      el.id = 'kcg-portal-boot-cover';
      el.setAttribute('aria-hidden', 'true');
      // pointer-events:none で下の要素の操作を妨げない
      el.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;margin:0;padding:0;border:0';
      (document.body || document.documentElement).appendChild(el);
    }
    el.style.background = color;
  }

  try {
    // 最初はデフォルトテーマ色（ストレージ取得前のちらつき防止）
    paint(P.bootCoverBg());

    // ストレージからテーマ名を読んで正しい色で上書きする
    function onStored(result) {
      const name = result && result[P.THEME_STORAGE_KEY];
      paint(P.bootCoverBg(name));
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(P.THEME_STORAGE_KEY, onStored);
    } else if (typeof browser !== 'undefined' && browser.storage?.local) {
      browser.storage.local.get(P.THEME_STORAGE_KEY).then(onStored).catch(() => {});
    }
  } catch (e) {}

})();
