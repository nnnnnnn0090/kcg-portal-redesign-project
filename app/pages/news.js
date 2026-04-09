/**
 * pages/news.js — お知らせ一覧ページ
 *
 * ロード順: document_idle（pages/home.js の後）。
 *
 * 役割:
 *   1. ページ HTML テンプレートを提供する（getHtml）
 *   2. ページ DOM 準備後に setup(root) を呼び出してもらい、
 *      年度タブ生成・フィルターイベント配線・初回 API リクエストを行う
 *   3. setup() はメッセージハンドラー { onDeliveredNews } を返す
 *      （boot.js がメッセージ配送テーブルにセットする）
 *
 * 公開: P.pages.news.getHtml(), P.pages.news.setup(root)
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});
  P.pages = P.pages || {};

  P.pages.news = {

    /**
     * お知らせ一覧ページの HTML 文字列を返す。
     * boot.js が P.setHtml() でオーバーレイルートに流し込む。
     *
     * @returns {string}
     */
    getHtml() {
      return `<main class="p-main p-main-news">
  <div class="p-main-head">
    <h1>お知らせ一覧</h1>
    <!-- 前回ログイン日時: syncLastLogin() で埋める -->
    <p class="p-last-login" id="p-last-login" hidden></p>
  </div>

  <!-- キノ（ポータルお知らせ）パネル: renderKino() が描画 -->
  <section class="p-panel p-panel-kino" id="p-kino-panel" hidden>
    <span class="p-panel-head" id="p-kino-title"></span>
    <div class="p-panel-body">
      <div class="p-kino-message" id="p-kino-body"></div>
    </div>
  </section>

  <div class="p-news-page">
    <div class="p-news-primary">
      <!-- 年度選択ナビ: setup() が動的生成 -->
      <nav class="p-news-nendo-nav" id="p-news-nendo-nav" aria-label="表示年度"></nav>
      <!-- 現在表示中の年度メッセージ -->
      <p class="p-news-nendo-msg" id="p-news-nendo-msg">読み込み中…</p>

      <section class="p-panel p-news-table-wrap">
        <span class="p-panel-head">お知らせ一覧</span>
        <div class="p-news-table-scroll">
          <table class="p-news-table" aria-label="お知らせ一覧">
            <thead>
              <tr>
                <th scope="col">日時</th>
                <th scope="col">タイトル</th>
                <th scope="col">配信元</th>
                <th scope="col">カテゴリ</th>
              </tr>
            </thead>
            <!-- renderTable() がここに行を埋める -->
            <tbody id="p-delivered-news-tbody">
              <tr><td colspan="4"><p class="p-news-empty">読み込み中…</p></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- 絞り込みサイドバー -->
    <aside class="p-news-aside" aria-label="絞り込み条件">
      <h2 class="p-news-filter-page-title">絞り込み条件</h2>

      <!-- 配信元フィルター -->
      <div class="p-news-mat">
        <h3>配信元で選択</h3>
        <ul class="p-news-checklist">
          <li><input type="checkbox" class="p-news-filter-sender" value="大学より"             id="p-nfs-a" /><label for="p-nfs-a">大学より</label></li>
          <li><input type="checkbox" class="p-news-filter-sender" value="システム室/System Dep" id="p-nfs-b" /><label for="p-nfs-b">システム室/System Dep</label></li>
          <li><input type="checkbox" class="p-news-filter-sender" value="CTLE"                  id="p-nfs-c" /><label for="p-nfs-c">CTLE</label></li>
          <li><input type="checkbox" class="p-news-filter-sender" value="KCGイベントグループ"   id="p-nfs-d" /><label for="p-nfs-d">KCGイベントグループ</label></li>
          <li><input type="checkbox" class="p-news-filter-sender" value="KCG OSS"               id="p-nfs-e" /><label for="p-nfs-e">KCG OSS</label></li>
          <li><input type="checkbox" class="p-news-filter-sender" value="キャリアセンター"       id="p-nfs-f" /><label for="p-nfs-f">キャリアセンター</label></li>
          <li><input type="checkbox" class="p-news-filter-sender" value="KCG AAO"               id="p-nfs-g" /><label for="p-nfs-g">KCG AAO</label></li>
          <li><input type="checkbox" class="p-news-filter-sender" value="KCGI OSS"              id="p-nfs-h" /><label for="p-nfs-h">KCGI OSS</label></li>
          <li><input type="checkbox" class="p-news-filter-sender" value="KCGI AAO"              id="p-nfs-i" /><label for="p-nfs-i">KCGI AAO</label></li>
          <li><input type="checkbox" class="p-news-filter-sender" value="KCGI Career"           id="p-nfs-j" /><label for="p-nfs-j">KCGI Career</label></li>
          <li><input type="checkbox" class="p-news-filter-sender" value="KCGM"                  id="p-nfs-k" /><label for="p-nfs-k">KCGM</label></li>
          <li><input type="checkbox" class="p-news-filter-sender" value="KJLTC"                 id="p-nfs-l" /><label for="p-nfs-l">KJLTC</label></li>
        </ul>
        <p class="p-news-mat-hint">※教員名で絞りたい場合はキーワードへ入力してください</p>
      </div>

      <!-- カテゴリフィルター -->
      <div class="p-news-mat">
        <h3>カテゴリで選択</h3>
        <ul class="p-news-checklist">
          <li><input type="checkbox" class="p-news-filter-cat" value="001" id="p-nfc-1" /><label for="p-nfc-1">学校より / School Announcements</label></li>
          <li><input type="checkbox" class="p-news-filter-cat" value="002" id="p-nfc-2" /><label for="p-nfc-2">学生呼び出し / Private Notice</label></li>
          <li><input type="checkbox" class="p-news-filter-cat" value="003" id="p-nfc-3" /><label for="p-nfc-3">休講・補講 / Canceled ・ Make-Up Classes</label></li>
          <li><input type="checkbox" class="p-news-filter-cat" value="004" id="p-nfc-4" /><label for="p-nfc-4">教室変更 / Classroom Change Notice</label></li>
          <li><input type="checkbox" class="p-news-filter-cat" value="005" id="p-nfc-5" /><label for="p-nfc-5">成績通知 / Grade Announcement</label></li>
        </ul>
      </div>

      <!-- キーワードフィルター -->
      <div class="p-news-mat">
        <h3>キーワード</h3>
        <input type="search" class="p-news-kw" id="p-news-kw-filter"
               placeholder="条件を入れてください" autocomplete="off" />
      </div>

      <div class="p-news-clear">
        <button type="button" class="p-news-clear-btn" id="p-news-filter-clear">条件クリア</button>
      </div>
    </aside>
  </div>
</main>`;
    },

    /**
     * ページ DOM 準備後に boot.js から呼び出されるセットアップ関数。
     *
     * 処理内容:
     *   - 年度ナビを動的生成（当年から過去 4 年分）
     *   - 配信元・カテゴリ・キーワードの各フィルターにイベントを配線
     *   - 当年度のお知らせを初回リクエスト
     *
     * @param {Element} root - オーバーレイのルート要素（フィルター要素のクエリに使う）
     * @returns {{ onDeliveredNews: (d: object) => boolean }}
     */
    setup(root) {
      // ページロード時点の最終ログイン日時（API リクエストパラメータに使用）
      const lastLoginSnap = (document.getElementById('lastLoginDt')?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();

      const nendoNav = document.getElementById('p-news-nendo-nav');
      const nendoMsg = document.getElementById('p-news-nendo-msg');
      const tbody    = document.getElementById('p-delivered-news-tbody');
      const kwInput  = document.getElementById('p-news-kw-filter');
      const y0       = new Date().getFullYear();

      // ── 内部状態 ──
      // nendo: 現在表示中の年度
      // pendingNendo: API レスポンス待ちの年度（古いレスポンスを無視するため）
      // raw: 現在の年度の全件データ
      const state = {
        nendo:        String(y0),
        pendingNendo: null,
        raw:          [],
      };

      // ────────────────────────────────────────────
      // フィルタリングと描画
      // ────────────────────────────────────────────

      /**
       * 現在の絞り込み条件を state.raw に適用して一致リストを返す。
       *
       * @returns {object[]}
       */
      function filteredList() {
        let list = state.raw.slice();

        // 配信元フィルター（チェックあり → OR 絞り込み）
        const senders = [...root.querySelectorAll('.p-news-filter-sender:checked')]
          .map((c) => c.value);
        if (senders.length) {
          list = list.filter((i) => senders.includes(String(i.sender || '')));
        }

        // カテゴリフィルター（カテゴリコードで一致判定）
        const cats = [...root.querySelectorAll('.p-news-filter-cat:checked')]
          .map((c) => c.value);
        if (cats.length) {
          list = list.filter((i) => cats.includes(String(i.categoryCd || '')));
        }

        // キーワードフィルター（タイトル・配信元・カテゴリ・日付を結合して部分一致）
        const kw = kwInput?.value?.trim().toLowerCase() || '';
        if (kw) {
          list = list.filter((i) =>
            `${i.title || ''} ${i.sender || ''} ${i.category || ''} ${i.newsDate || ''}`
              .toLowerCase()
              .includes(kw),
          );
        }

        return list;
      }

      /**
       * filteredList() の結果をテーブル tbody に描画する。
       */
      function renderTable() {
        if (!tbody) return;
        const list = filteredList();

        if (list.length === 0) {
          P.setHtml(tbody, '<tr><td colspan="4"><p class="p-news-empty">該当するお知らせはありません。</p></td></tr>');
          return;
        }

        P.setHtml(tbody, list.map((i) => {
          const unread = String(i.readFlg) === '0';
          const cls    = unread ? 'p-news-unread' : '';

          // 重要度バッジ（01=通常 以外のとき表示）
          const imp = i.importanceCd && String(i.importanceCd) !== '01' && i.importance
            ? `<span class="p-news-meta">${P.esc(String(i.importance))}</span>`
            : '';

          // NEW バッジ
          const newBadge = String(i.newFlg) === '1'
            ? '<span class="p-news-meta">NEW</span>'
            : '';

          return `<tr>
  <td class="${cls}">${P.esc(String(i.newsDate || ''))}</td>
  <td class="${cls}">${imp}<a href="${P.escAttr(P.newsHref(i.id))}" class="${cls}">${P.esc(String(i.title || ''))}</a>${newBadge}</td>
  <td class="${cls}">${P.esc(String(i.sender || ''))}</td>
  <td class="${cls}">${P.esc(String(i.category || ''))}</td>
</tr>`;
        }).join(''));
      }

      /**
       * 年度メッセージとテーブルをまとめて更新する。
       */
      function redraw() {
        if (nendoMsg) {
          nendoMsg.textContent = state.raw.length > 0
            ? `${state.nendo}年度のお知らせ一覧を表示しています。`
            : `${state.nendo}年度のお知らせはありません。`;
        }
        renderTable();
      }

      // ────────────────────────────────────────────
      // 年度リクエスト
      // ────────────────────────────────────────────

      /**
       * 指定年度のお知らせを API からリクエストする。
       * レスポンスが戻るまでテーブルに「読み込み中」を表示する。
       *
       * @param {string} nendo - 年度（4桁文字列）
       */
      function requestNendo(nendo) {
        state.nendo        = nendo;
        state.pendingNendo = nendo;  // 応答待ち年度を記録（古いレスポンスを無視するため）
        state.raw          = [];
        if (tbody) {
          P.setHtml(tbody, '<tr><td colspan="4"><p class="p-news-empty">読み込み中…</p></td></tr>');
        }
        if (nendoMsg) nendoMsg.textContent = '読み込み中…';
        P.pageFetch(P.urls.deliveredNendo(nendo, lastLoginSnap));
      }

      // ────────────────────────────────────────────
      // 年度ナビ生成（当年 〜 当年-4 の計 5 件）
      // ────────────────────────────────────────────

      if (nendoNav) {
        nendoNav.replaceChildren();
        for (let k = 0; k < 5; k++) {
          const n   = String(y0 - k);
          const btn = document.createElement('button');
          btn.type            = 'button';
          btn.className       = 'p-news-nendo-btn';
          btn.dataset.nendo   = n;
          btn.textContent     = `${n} 年度`;
          if (n === state.nendo) btn.classList.add('is-active');
          btn.addEventListener('click', () => {
            state.nendo = n;
            nendoNav.querySelectorAll('.p-news-nendo-btn')
              .forEach((b) => b.classList.toggle('is-active', b.dataset.nendo === n));
            requestNendo(n);
          });
          nendoNav.appendChild(btn);
        }
      }

      // ────────────────────────────────────────────
      // フィルターイベント配線
      // ────────────────────────────────────────────

      root.querySelectorAll('.p-news-filter-sender, .p-news-filter-cat')
        .forEach((el) => el.addEventListener('change', redraw));

      kwInput?.addEventListener('input', redraw);

      document.getElementById('p-news-filter-clear')?.addEventListener('click', () => {
        root.querySelectorAll('.p-news-filter-sender, .p-news-filter-cat')
          .forEach((c) => { c.checked = false; });
        if (kwInput) kwInput.value = '';
        redraw();
      });

      // 初回: 当年度をリクエスト
      requestNendo(state.nendo);

      // ────────────────────────────────────────────
      // メッセージハンドラー
      // ────────────────────────────────────────────

      return {
        /**
         * 年度別お知らせ一覧の API レスポンスを受け取って描画する。
         * requestUrl から年度を逆パースし、待機中の年度と一致するか確認する。
         * 古いレスポンス（競合）は false を返して無視する。
         *
         * @param {{ requestUrl: string, items: object[] }} d
         * @returns {boolean}
         */
        onDeliveredNews(d) {
          if (!d.requestUrl || !Array.isArray(d.items)) return false;

          // requestUrl から年度セグメントを抽出する
          let respNendo = '';
          try {
            const m = new URL(d.requestUrl, location.origin).pathname
              .match(/\/DeliveredNews\/Nendo\/([^/]+)/);
            if (m) respNendo = m[1];
          } catch (e) { /* 無効な URL は無視 */ }

          if (respNendo !== state.pendingNendo) return false;

          state.pendingNendo = null;
          state.raw          = d.items;
          redraw();
          return true;
        },
      };
    },
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
