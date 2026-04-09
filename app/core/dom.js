/**
 * core/dom.js — DOM / HTML ユーティリティ
 *
 * ロード順: document_idle、最初にロードされるユーティリティ群の一つ。
 *
 * XSS 対策・安全な HTML 挿入・URL 生成などを提供する純粋関数の集合。
 * ここの関数は副作用を持たず、DOM クエリも最小限にとどめる。
 *
 * 公開: P.esc, P.escAttr, P.setHtml, P.newsHref
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // ────────────────────────────────────────────
  // テキスト / 属性 エスケープ
  // ────────────────────────────────────────────

  /**
   * 文字列を HTML テキストノード用にエスケープして返す（XSS 対策）。
   * innerHTML への埋め込みに使う。
   *
   * @param {unknown} s
   * @returns {string}
   */
  function esc(s) {
    const div = document.createElement('div');
    div.textContent = String(s ?? '');
    return div.innerHTML;
  }

  /**
   * 文字列を HTML 属性値用にエスケープして返す（" & < を実体参照に変換）。
   *
   * @param {unknown} s
   * @returns {string}
   */
  function escAttr(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  // ────────────────────────────────────────────
  // 安全な innerHTML 置き換え
  //
  // 拡張機能の addon-linter は innerHTML への直接代入を警告するため、
  // DOMParser でパースして replaceChildren() で差し替える方式を採る。
  //
  // tbody / thead / tfoot / ul / ol は単体でパースするとブラウザが
  // 構造を破壊するため、親要素でラップしてから取り出す。
  // ────────────────────────────────────────────

  /**
   * container の中身を html 文字列で安全に置き換える。
   *
   * @param {Element | null | undefined} container
   * @param {string} html
   */
  function setHtml(container, html) {
    if (!container) return;
    const tag = container.tagName;

    // テーブル行系要素: <table> でラップしてパース
    if (tag === 'TBODY' || tag === 'THEAD' || tag === 'TFOOT') {
      const t   = tag.toLowerCase();
      const doc = new DOMParser().parseFromString(`<table><${t}>${html}</${t}></table>`, 'text/html');
      const inner = doc.querySelector(t);
      if (inner) { container.replaceChildren(...inner.childNodes); return; }
    }

    // リスト系要素: 対応タグでラップしてパース
    if (tag === 'UL' || tag === 'OL') {
      const t   = tag.toLowerCase();
      const doc = new DOMParser().parseFromString(`<${t}>${html}</${t}>`, 'text/html');
      const inner = doc.querySelector(t);
      if (inner) { container.replaceChildren(...inner.childNodes); return; }
    }

    // 通常要素
    const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
    container.replaceChildren(...doc.body.childNodes);
  }

  // ────────────────────────────────────────────
  // URL ヘルパー
  // ────────────────────────────────────────────

  /**
   * お知らせ詳細ページの URL を組み立てて返す。
   *
   * @param {string | number} id - お知らせ ID
   * @returns {string}
   */
  function newsHref(id) {
    return `${location.origin}/portal/News/Detail/${encodeURIComponent(String(id))}`;
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  Object.assign(P, { esc, escAttr, setHtml, newsHref });

})(typeof globalThis !== 'undefined' ? globalThis : window);
