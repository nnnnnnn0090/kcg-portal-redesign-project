/**
 * pages/detail.js — お知らせ詳細ページ
 *
 * ロード順: document_idle（pages/news.js の後）。
 *
 * 役割:
 *   1. ページ HTML テンプレートを提供する（getHtml）
 *   2. setup(newsDetailId) でメッセージハンドラー { onDeliveredNewsDetail } を返す
 *      （boot.js がメッセージ配送テーブルにセットする）
 *
 * 公開: P.pages.detail.getHtml(), P.pages.detail.setup(newsDetailId)
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});
  P.pages = P.pages || {};

  /**
   * ポータル本体（オーバーレイ外）の添付リストから、表示名が一致する <a> を探す。
   * Knockout の data-bind click でダウンロードする公式リンクをそのまま発火するために使う。
   *
   * @param {string} filename
   * @returns {HTMLAnchorElement | null}
   */
  function findPortalNativeAttachmentLink(filename) {
    const want = String(filename || '').replace(/\s+/g, ' ').trim();
    if (!want) return null;
    const anchors = [...document.querySelectorAll('.attachments ul.fileList a, ul.fileList li a')]
      .filter((el) => el instanceof HTMLAnchorElement && !el.closest('#portal-overlay'));
    for (const a of anchors) {
      const span = a.querySelector('span[data-bind*="filename"]');
      const label = String(
        (span && span.textContent) || a.textContent || '',
      ).replace(/\s+/g, ' ').trim();
      if (label === want) return a;
    }
    return null;
  }

  /** @param {MouseEvent} e */
  function onAttachmentProxyListClick(e) {
    const fileList = e.currentTarget;
    if (!(fileList instanceof HTMLElement)) return;
    const a = e.target.closest('a.p-news-detail-file-proxy');
    if (!a || !fileList.contains(a)) return;
    e.preventDefault();
    const name = (a.getAttribute('data-filename') || a.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
    const orig = findPortalNativeAttachmentLink(name);
    if (orig) orig.click();
  }

  P.pages.detail = {

    /**
     * お知らせ詳細ページの HTML 文字列を返す。
     * boot.js が P.setHtml() でオーバーレイルートに流し込む。
     *
     * @returns {string}
     */
    getHtml() {
      return `<main class="p-main p-main-news">
  <div class="p-main-head">
    <div class="p-news-detail-head-block">
      <!-- お知らせ一覧へ戻るリンク -->
      <a class="p-news-detail-back" href="/portal/News">お知らせ一覧</a>
      <!-- タイトル: onDeliveredNewsDetail() で埋める -->
      <h1 class="p-news-detail-title" id="p-news-detail-title">読み込み中…</h1>
    </div>
    <!-- 前回ログイン日時: syncLastLogin() で埋める -->
    <p class="p-last-login" id="p-last-login" hidden></p>
  </div>
  <div class="p-stack">
    <!-- 掲載情報（日時・配信元・カテゴリ） -->
    <section class="p-panel">
      <span class="p-panel-head">掲載情報</span>
      <div class="p-panel-body" id="p-news-detail-meta"></div>
    </section>

    <!-- 本文（formatMessageBody() で HTML 変換してから流し込む） -->
    <section class="p-panel p-panel-kino">
      <span class="p-panel-head">本文</span>
      <div class="p-panel-body p-kino-message" id="p-news-detail-body">
        <p class="p-empty">読み込み中…</p>
      </div>
    </section>

    <!-- 添付ファイルセクション（ファイルがない場合は hidden のまま） -->
    <section class="p-panel" id="p-news-detail-attachments" hidden>
      <span class="p-panel-head">添付ファイル</span>
      <div class="p-panel-body">
        <ul class="p-news-detail-file-list" id="p-news-detail-file-list"></ul>
      </div>
    </section>

    <!-- フッターナビ -->
    <div class="p-news-detail-foot">
      <a class="p-nav-btn" href="/portal/">ホーム</a>
      <a class="p-nav-btn" href="/portal/News">お知らせ一覧</a>
    </div>
  </div>
</main>`;
    },

    /**
     * ページ DOM 準備後に boot.js から呼び出されるセットアップ関数。
     * この時点では API レスポンスはまだ届いていない。
     * boot.js 側で P.pageFetch(P.urls.deliveredDetail(id)) を発行する。
     *
     * @param {string} newsDetailId - URL から取得したお知らせ ID
     * @returns {{ onDeliveredNewsDetail: (d: object) => boolean }}
     */
    setup(newsDetailId) {
      const fileListEl = document.getElementById('p-news-detail-file-list');
      if (fileListEl && !fileListEl.dataset.kcgAttachmentProxy) {
        fileListEl.dataset.kcgAttachmentProxy = '1';
        fileListEl.addEventListener('click', onAttachmentProxyListClick);
      }

      return {
        /**
         * お知らせ詳細 API のレスポンスを受け取って描画する。
         * 別の詳細ページのレスポンスが混入した場合は false を返して無視する。
         *
         * @param {{ data: object }} d
         * @returns {boolean}
         */
        onDeliveredNewsDetail(d) {
          if (!d.data || typeof d.data !== 'object') return false;
          if (String(d.data.id || '') !== String(newsDetailId)) return false;

          const titleEl   = document.getElementById('p-news-detail-title');
          const metaEl    = document.getElementById('p-news-detail-meta');
          const bodyEl    = document.getElementById('p-news-detail-body');
          const attachSec = document.getElementById('p-news-detail-attachments');
          const fileList  = document.getElementById('p-news-detail-file-list');

          // タイトル
          if (titleEl) {
            titleEl.textContent = String(d.data.title || '').trim() || 'お知らせ';
          }

          // 掲載情報グリッド
          if (metaEl) {
            /**
             * 値が存在する場合のみ定義行 HTML を返す。
             *
             * @param {string} key
             * @param {string} val
             * @returns {string}
             */
            const metaRow = (key, val) => val
              ? `<div class="p-news-detail-meta-row">
  <span class="p-news-detail-meta-k">${key}</span>
  <span class="p-news-detail-meta-v">${P.esc(val)}</span>
</div>`
              : '';

            const rows = [
              metaRow('掲載日時', String(d.data.newsDate || '').trim()),
              metaRow('配信元',   String(d.data.sender   || '').trim()),
              metaRow('カテゴリ', String(d.data.category || '').trim()),
            ].filter(Boolean);

            P.setHtml(metaEl, rows.length
              ? `<div class="p-news-detail-meta-grid">${rows.join('')}</div>`
              : '<p class="p-empty">情報はありません</p>');
          }

          // 本文: formatMessageBody() で改行→<br>、URL→<a> に変換してから挿入する
          if (bodyEl) {
            P.setHtml(bodyEl, P.formatMessageBody(String(d.data.naiyo || '')));
          }

          // 添付: クリック時はポータル本体の ul.fileList 内リンクを発火（Knockout の attachment 用）。表示名は API と一致させる。
          if (attachSec && fileList) {
            const files = d.data.attachmentFiles;
            if (Array.isArray(files) && files.length > 0) {
              attachSec.hidden = false;
              P.setHtml(fileList, files.map((f) => {
                if (typeof f === 'string') {
                  const raw = String(f).trim();
                  if (!raw) return '';
                  return `<li><a href="#" class="p-news-detail-file-proxy" data-filename="${P.escAttr(raw)}">${P.esc(raw)}</a></li>`;
                }
                const name = String(
                  (f && (f.filename || f.fileName || f.name)) || 'ファイル',
                ).trim();
                return `<li><a href="#" class="p-news-detail-file-proxy" data-filename="${P.escAttr(name)}">${P.esc(name)}</a></li>`;
              }).filter(Boolean).join(''));
            } else {
              attachSec.hidden = true;
              fileList.replaceChildren();
            }
          }

          return true;
        },
      };
    },
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
