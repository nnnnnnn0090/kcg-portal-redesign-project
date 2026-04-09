/**
 * renderers/news.js — お知らせ一覧の描画
 *
 * ロード順: document_idle（shell/footer.js の後）。
 *
 * 公開: P.renderNews(mount, items, options)
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  /**
   * お知らせ一覧を mount 要素に描画する。
   *
   * @param {Element | null} mount        - 描画先要素
   * @param {unknown[]} items             - API から取得したお知らせ配列（readFlg===0 / '0' で未読、newFlg===1 で NEW）
   * @param {{ emptyMsg?: string }} [options]
   */
  function renderNews(mount, items, options) {
    if (!mount) return;
    const emptyMsg = options?.emptyMsg || 'お知らせはありません';

    if (!Array.isArray(items) || items.length === 0) {
      P.setHtml(mount, `<p class="p-empty">${P.esc(emptyMsg)}</p>`);
      return;
    }

    P.setHtml(mount, items
      .filter((i) => i.title)
      .map((i) => {
        const unread = String(i.readFlg) === '0';
        const cls = unread ? ' p-news-unread' : '';
        const newBadge = String(i.newFlg) === '1'
          ? ' <span class="p-news-new-badge" aria-hidden="true">NEW</span>'
          : '';
        return `<article class="p-news${cls}">
  <time>${P.esc((i.newsDate || '').replace(/-/g, '/'))}</time>
  <a href="${P.escAttr(P.newsHref(i.id))}">${P.esc(i.title)}${newBadge}</a>
  <span>${P.esc(i.sender || '')} · ${P.esc(i.category || '')}</span>
</article>`;
      })
      .join(''));
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  P.renderNews = renderNews;

})(typeof globalThis !== 'undefined' ? globalThis : window);
