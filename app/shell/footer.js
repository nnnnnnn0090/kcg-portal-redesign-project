/**
 * shell/footer.js — フッター HTML テンプレート + DOM 同期
 *
 * ロード順: document_idle（shell/header.js の後）。
 *
 * 役割:
 *   1. オーバーレイのフッター・ポップアップ・FAB HTML を生成する（getFooterHtml）
 *   2. ポータル元のフッターコンテンツをオーバーレイにコピーする（syncFooter）
 *
 * syncFooter は初回のみ呼ぶことを想定している（フッターは変化しないため）。
 *
 * 公開: P.getFooterHtml, P.syncFooter
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // ────────────────────────────────────────────
  // フッター HTML テンプレート
  // ────────────────────────────────────────────

  function getFooterHtml() {
    return `
<!-- サイトフッター: syncFooter() でポータル元の内容を埋める -->
<footer class="p-site-footer" id="p-site-footer" hidden aria-label="フッター">
  <div class="container" id="p-footer-mount"></div>
</footer>

<!-- カレンダーセルのホバーポップアップ -->
<div id="p-cal-hover-pop" class="p-cal-hover-pop" hidden role="tooltip"></div>

<!-- 授業カレンダーの右クリックコンテキストメニュー -->
<div id="p-cal-ctx-menu" class="p-cal-ctx-menu" hidden role="menu" aria-label="講義リンク先">
  <button type="button" id="p-cal-ctx-syllabus" class="p-cal-ctx-item" role="menuitem">シラバスを開く</button>
  <button type="button" id="p-cal-ctx-kinglms"  class="p-cal-ctx-item" role="menuitem">King LMS を開く</button>
</div>

<!-- フローティングアクションボタン群 -->
<div class="p-fab-cluster" role="group" aria-label="ページ末尾の操作">
  <button type="button" class="p-share-ext-btn" id="p-share-extension"
          aria-label="拡張機能の紹介ページのURLをコピー"
          title="非公式ポータルUI拡張の紹介ページのURLをコピー">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
    <span>拡張機能を紹介</span>
  </button>
  <button type="button" class="p-scroll-top-btn" id="p-scroll-top"
          aria-label="ページ先頭へ" title="ページ先頭へ">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 15l-6-6-6 6"/>
    </svg>
  </button>
</div>

<!-- トースト通知 -->
<div id="p-toast" class="p-toast" role="status" aria-live="polite" hidden></div>`;
  }

  // ────────────────────────────────────────────
  // フッター DOM 同期（初回のみ実行）
  // ────────────────────────────────────────────

  /**
   * ポータル元のフッターコンテンツをオーバーレイにコピーし、
   * クレジット表記を追加する。
   *
   * @param {{ footerEl: Element | null, mountEl: Element | null }} els
   */
  function syncFooter(els) {
    const { footerEl, mountEl } = els;
    if (!footerEl || !mountEl) return;

    // ポータル元のフッターコンテナを探す（複数セレクタを順番に試す）
    const selectors = [
      'body > footer .container',
      'footer .container',
      '#footer .container',
      '.footer .container',
    ];
    const src = selectors.reduce((found, sel) => {
      if (found) return found;
      try {
        // <small> を含むものだけを有効なフッターとみなす
        return [...document.querySelectorAll(sel)]
          .find((c) => !c.closest('#portal-overlay') && c.querySelector('small'));
      } catch (e) { return null; }
    }, null);

    if (!src) { footerEl.hidden = true; return; }

    // <script> タグを除いて子要素をコピーする
    mountEl.replaceChildren();
    for (const child of src.children) {
      if (child.tagName === 'SCRIPT') continue;
      mountEl.appendChild(child.cloneNode(true));
    }

    // クレジット表記を著作権表示の <small> の直後に追加する
    const creditEl = document.createElement('small');
    creditEl.className = 'p-footer-credit';
    creditEl.appendChild(document.createTextNode('Redesigned by '));
    const creditLink = document.createElement('a');
    creditLink.href   = 'https://x.com/nnnnnnn0090';
    creditLink.target = '_blank';
    creditLink.rel    = 'noopener noreferrer';
    creditLink.textContent = 'nnnnnnn0090';
    creditEl.appendChild(creditLink);

    const copyrightSm = mountEl.querySelector('small');
    if (copyrightSm) copyrightSm.after(creditEl);
    else mountEl.appendChild(creditEl);

    // ポータル元の「先頭へ」リンクは右下の固定ボタンで代替するため除去する
    mountEl.querySelectorAll('.pageTop, a[href="#top"], a[href="#Top"]').forEach((el) => el.remove());

    footerEl.hidden = false;
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  Object.assign(P, { getFooterHtml, syncFooter });

})(typeof globalThis !== 'undefined' ? globalThis : window);
