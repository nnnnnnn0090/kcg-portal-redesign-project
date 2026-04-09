/**
 * renderers/kino.js — キノメッセージ（ポータルお知らせパネル）の描画
 *
 * ロード順: document_idle（renderers/links.js の後）。
 *
 * 公開: P.renderKino(els, data, forceVisible), P.formatMessageBody(raw)
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // ────────────────────────────────────────────
  // 本文のフォーマット
  // ────────────────────────────────────────────

  /**
   * キノメッセージの本文テキストを表示用 HTML に変換する。
   * 改行を <br> に変換し、URL を <a> タグでリンク化する。
   *
   * @param {string} raw - プレーンテキストの本文
   * @returns {string} 表示用 HTML
   */
  function formatMessageBody(raw) {
    // まず全体をエスケープしてから <br> とリンクを追加する（XSS 対策）
    const escaped = P.esc(String(raw || ''));
    const withBr  = escaped.replace(/\r?\n/g, '<br>');

    // http/https/ftp/file スキームの URL を <a> タグでリンク化する
    const urlRe = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
    return withBr.replace(urlRe, (url) =>
      `<a href="${P.escAttr(url)}" target="_blank" rel="noopener noreferrer">${url}</a>`,
    );
  }

  // ────────────────────────────────────────────
  // パネル描画
  // ────────────────────────────────────────────

  /**
   * キノ（ポータルお知らせ）パネルにデータを描画する。
   *
   * @param {{ panelEl: Element | null, titleEl: Element | null, bodyEl: Element | null }} els
   * @param {{ title?: string, message?: string } | null} data - API レスポンス
   * @param {boolean} forceVisible - true のとき空でもパネルを表示する
   */
  function renderKino(els, data, forceVisible) {
    const { panelEl, titleEl, bodyEl } = els;
    if (!panelEl || !titleEl || !bodyEl) return;

    const title   = data && String(data.title   || '').trim();
    const message = data && String(data.message || '').trim();

    if (!title || !message) {
      if (forceVisible) {
        // 強制表示モード: タイトルなしのプレースホルダーを表示する
        panelEl.hidden     = false;
        titleEl.textContent = 'お知らせ';
        P.setHtml(bodyEl, '<p class="p-empty">お知らせはありません</p>');
      } else {
        // 通常モード: パネルごと非表示にする
        panelEl.hidden     = true;
        titleEl.textContent = '';
        bodyEl.textContent  = '';
      }
      return;
    }

    panelEl.hidden     = false;
    titleEl.textContent = title;
    P.setHtml(bodyEl, formatMessageBody(message));
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  Object.assign(P, { renderKino, formatMessageBody });

})(typeof globalThis !== 'undefined' ? globalThis : window);
