/**
 * pages/kyuko.js — 休講・補講・教室変更ページ
 *
 * ロード順: document_idle（pages/detail.js の後）。
 *
 * 役割:
 *   1. ページ HTML テンプレートを提供する（getHtml）
 *   2. setup(root) で 3 種の API をリクエストし、
 *      メッセージハンドラー { onKyukoInfo, onHokoInfo, onKyoshitsuChange } を返す
 *
 * 設計メモ:
 *   - API のキー名が大文字始まり/小文字始まりで揺れるため pick() で吸収する
 *   - 「自分の履修講義のみ」フィルターは userId から生成したトークンを使う
 *     （API レスポンス受信前はチェックボックスを disabled にする）
 *
 * 公開: P.pages.kyuko.getHtml(), P.pages.kyuko.setup(root)
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});
  P.pages = P.pages || {};

  // ────────────────────────────────────────────
  // フィールド取得ユーティリティ
  // ────────────────────────────────────────────

  /**
   * API レスポンスのキー名の揺れを吸収する。
   * keys を順に試し、空文字でない最初の値を返す。
   *
   * @param {object | null} obj
   * @param {string[]} keys
   * @returns {string}
   */
  function pick(obj, keys) {
    if (!obj) return '';
    for (const k of keys) {
      if (obj[k] != null && String(obj[k]).trim() !== '') return String(obj[k]);
    }
    return '';
  }

  // ────────────────────────────────────────────
  // 履修フィルター
  // ────────────────────────────────────────────

  /**
   * 1件の行が指定トークンを含むか判定する。
   * rishu / rishuUnder / kyoin / kyoin2 のうち1つでも含めば true。
   *
   * @param {object} item
   * @param {string} rishuKey
   * @param {string} rishuUnderKey
   * @param {string} kyoinKey
   * @param {string | null} kyoin2Key
   * @param {string} token
   * @returns {boolean}
   */
  function matchesToken(item, rishuKey, rishuUnderKey, kyoinKey, kyoin2Key, token) {
    const check = (v) => v != null && String(v).includes(token);
    return (
      check(item[rishuKey]) ||
      check(item[rishuUnderKey]) ||
      check(item[kyoinKey]) ||
      (kyoin2Key != null && check(item[kyoin2Key]))
    );
  }

  /**
   * リスト全体をトークンでフィルタリングして返す。
   * トークンが空の場合は全件そのまま返す。
   *
   * @param {object[] | null} list
   * @param {string} token
   * @param {{ rishu: string, rishuUnder: string, kyoin: string, kyoin2?: string }} keys
   * @returns {object[]}
   */
  function filterByRishuToken(list, token, keys) {
    if (!token || !Array.isArray(list)) return Array.isArray(list) ? list.slice() : [];
    return list.filter((item) =>
      matchesToken(item, keys.rishu, keys.rishuUnder, keys.kyoin, keys.kyoin2 ?? null, token),
    );
  }

  /**
   * API レスポンスの行から userId を抽出する（履修トークン生成に使う）。
   *
   * @param {object[] | null} items
   * @returns {string}
   */
  function firstUserIdFromItems(items) {
    if (!Array.isArray(items)) return '';
    for (const row of items) {
      const uid = row?.userId != null ? String(row.userId).trim() : '';
      if (uid) return uid;
    }
    return '';
  }

  // ────────────────────────────────────────────
  // テーブル行 HTML ビルダー
  // ────────────────────────────────────────────

  /**
   * 休講情報 1 件の <tr> HTML を返す。
   *
   * @param {(s: string) => string} esc - P.esc
   * @param {object} row
   * @returns {string}
   */
  function rowKyuko(esc, row) {
    return `<tr>
  <td>${esc(pick(row, ['kyukoDate','KyukoDate','hiduke','Hiduke']))}</td>
  <td>${esc(pick(row, ['yobi','Yobi','yobiNm','YobiNm']))}</td>
  <td>${esc(pick(row, ['jigen','Jigen','jigenNm','JigenNm']))}</td>
  <td>${esc(pick(row, ['kogiNm','KogiNm','kogiName','KogiName']))}</td>
  <td class="p-kyuko-hide-narrow">${esc(pick(row, ['kyoinNms','KyoinNms','kyoinNm','KyoinNm','tantoKyoinNm','TantoKyoinNm']))}</td>
  <td class="p-kyuko-hide-narrow">${esc(pick(row, ['biko','Biko','renrakuJiko','RenrakuJiko']))}</td>
</tr>`;
  }

  /**
   * 補講情報 1 件の <tr> HTML を返す（教室列あり）。
   *
   * @param {(s: string) => string} esc - P.esc
   * @param {object} row
   * @returns {string}
   */
  function rowHoko(esc, row) {
    return `<tr>
  <td>${esc(pick(row, ['hokoDate','HokoDate','hiduke','Hiduke']))}</td>
  <td>${esc(pick(row, ['yobi','Yobi','yobiNm','YobiNm']))}</td>
  <td>${esc(pick(row, ['jigen','Jigen','jigenNm','JigenNm']))}</td>
  <td>${esc(pick(row, ['kogiNm','KogiNm','kogiName','KogiName']))}</td>
  <td class="p-kyuko-hide-narrow">${esc(pick(row, ['kyoinNms','KyoinNms','kyoinNm','KyoinNm','tantoKyoinNm','TantoKyoinNm']))}</td>
  <td class="p-kyuko-hide-narrow">${esc(pick(row, ['hokoKyoshitsuNms','HokoKyoshitsuNms','kyoshitsuNms','KyoshitsuNms','hokoKyoshitsuNm','HokoKyoshitsuNm','kyoshitsuNm','KyoshitsuNm','_kyoshitsuNm','_hokoKyoshitsuNm']))}</td>
  <td class="p-kyuko-hide-narrow">${esc(pick(row, ['biko','Biko','renrakuJiko','RenrakuJiko']))}</td>
</tr>`;
  }

  /**
   * 教室変更情報 1 件の <tr> HTML を返す（変更前・変更後の教室列あり）。
   *
   * @param {(s: string) => string} esc - P.esc
   * @param {object} row
   * @returns {string}
   */
  function rowKc(esc, row) {
    return `<tr>
  <td>${esc(pick(row, ['kcDate','KcDate','kyoshitsuChangeDate','KyoshitsuChangeDate','hiduke','Hiduke']))}</td>
  <td>${esc(pick(row, ['yobi','Yobi','yobiNm','YobiNm']))}</td>
  <td>${esc(pick(row, ['jigen','Jigen','jigenNm','JigenNm']))}</td>
  <td>${esc(pick(row, ['kogiNm','KogiNm','kogiName','KogiName']))}</td>
  <td class="p-kyuko-hide-narrow">${esc(pick(row, ['kyoinNms','KyoinNms','kyoinNm','KyoinNm','tantoKyoinNm','TantoKyoinNm']))}</td>
  <td class="p-kyuko-hide-narrow">${esc(pick(row, ['kyoshitsuNmOld','KyoshitsuNmOld','_kyoshitsuNmOld','kyoshitsuOld','KyoshitsuOld','henkoMaeKyoshitsuNm','HenkoMaeKyoshitsuNm']))}</td>
  <td class="p-kyuko-hide-narrow">${esc(pick(row, ['kyoshitsuNmNew','KyoshitsuNmNew','_kyoshitsuNmNew','kyoshitsuNew','KyoshitsuNew','henkoGoKyoshitsuNm','HenkoGoKyoshitsuNm']))}</td>
  <td class="p-kyuko-hide-narrow">${esc(pick(row, ['biko','Biko','renrakuJiko','RenrakuJiko']))}</td>
</tr>`;
  }

  // ────────────────────────────────────────────
  // ページ定義
  // ────────────────────────────────────────────

  P.pages.kyuko = {

    /**
     * 休講・補講・教室変更ページの HTML 文字列を返す。
     * boot.js が P.setHtml() でオーバーレイルートに流し込む。
     *
     * @returns {string}
     */
    getHtml() {
      return `<main class="p-main p-main-news">
  <div class="p-main-head">
    <!-- 年度ラベル: setup() で埋める -->
    <h1 class="p-kyuko-page-title"><span id="p-kyuko-nendo-label"></span> 休講・補講・教室変更情報</h1>
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

  <div class="p-news-page p-kyuko-page">
    <div class="p-news-primary">

      <!-- セクション間ジャンプナビ -->
      <nav class="p-kyuko-jump" aria-label="一覧への移動">
        <a class="p-nav-btn" href="#p-kyuko-section">休講一覧</a>
        <a class="p-nav-btn" href="#p-hoko-section">補講一覧</a>
        <a class="p-nav-btn" href="#p-kc-section">教室変更一覧</a>
      </nav>

      <!-- 休講テーブル -->
      <section class="p-news-table-wrap" id="p-kyuko-section">
        <span class="p-panel-head">休講一覧</span>
        <div class="p-news-table-scroll">
          <table class="p-news-table p-kyuko-table" aria-label="休講一覧">
            <thead>
              <tr>
                <th scope="col">日付</th>
                <th scope="col">曜日</th>
                <th scope="col">時限</th>
                <th scope="col">講義名</th>
                <th scope="col" class="p-kyuko-hide-narrow">担当教員</th>
                <th scope="col" class="p-kyuko-hide-narrow">連絡事項</th>
              </tr>
            </thead>
            <tbody id="p-kyuko-tbody">
              <tr><td colspan="6"><p class="p-news-empty">読み込み中…</p></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 補講テーブル -->
      <section class="p-news-table-wrap" id="p-hoko-section">
        <span class="p-panel-head">補講一覧</span>
        <div class="p-news-table-scroll">
          <table class="p-news-table p-kyuko-table" aria-label="補講一覧">
            <thead>
              <tr>
                <th scope="col">日付</th>
                <th scope="col">曜日</th>
                <th scope="col">時限</th>
                <th scope="col">講義名</th>
                <th scope="col" class="p-kyuko-hide-narrow">担当教員</th>
                <th scope="col" class="p-kyuko-hide-narrow">教室</th>
                <th scope="col" class="p-kyuko-hide-narrow">連絡事項</th>
              </tr>
            </thead>
            <tbody id="p-hoko-tbody">
              <tr><td colspan="7"><p class="p-news-empty">読み込み中…</p></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 教室変更テーブル -->
      <section class="p-news-table-wrap" id="p-kc-section">
        <span class="p-panel-head">教室変更一覧</span>
        <div class="p-news-table-scroll">
          <table class="p-news-table p-kyuko-table" aria-label="教室変更一覧">
            <thead>
              <tr>
                <th scope="col">日付</th>
                <th scope="col">曜日</th>
                <th scope="col">時限</th>
                <th scope="col">講義名</th>
                <th scope="col" class="p-kyuko-hide-narrow">担当教員</th>
                <th scope="col" class="p-kyuko-hide-narrow">変更前</th>
                <th scope="col" class="p-kyuko-hide-narrow">変更後</th>
                <th scope="col" class="p-kyuko-hide-narrow">連絡事項</th>
              </tr>
            </thead>
            <tbody id="p-kc-tbody">
              <tr><td colspan="8"><p class="p-news-empty">読み込み中…</p></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- 絞り込みサイドバー -->
    <aside class="p-news-aside" aria-label="絞り込み">
      <h2 class="p-news-filter-page-title">絞り込み条件</h2>
      <div class="p-news-mat">
        <label class="p-settings-row" style="margin:0;cursor:pointer;padding:.35rem 0;">
          <input type="checkbox" id="p-kyuko-only-rishu" />
          <span>自分の履修講義のみ</span>
        </label>
        <!-- API レスポンス受信前に表示するヒント -->
        <p class="p-news-mat-hint" id="p-kyuko-rishu-hint">
          一覧の API 応答を受け取るまで、この条件は使えません。
        </p>
      </div>
    </aside>
  </div>
</main>`;
    },

    /**
     * ページ DOM 準備後に boot.js から呼び出されるセットアップ関数。
     * 3 種の API をリクエストし、メッセージハンドラーを返す。
     *
     * @param {Element} root - オーバーレイのルート要素（アンカースクロールの起点）
     * @returns {{ onKyukoInfo: Function, onHokoInfo: Function, onKyoshitsuChange: Function }}
     */
    setup(root) {
      // 現在の年度をタイトルラベルに設定する
      const nendo    = P.currentNendo();
      const nendoEl  = document.getElementById('p-kyuko-nendo-label');
      if (nendoEl) nendoEl.textContent = `${nendo}年度`;

      const tbodyK  = document.getElementById('p-kyuko-tbody');
      const tbodyH  = document.getElementById('p-hoko-tbody');
      const tbodyC  = document.getElementById('p-kc-tbody');
      const cbRishu = document.getElementById('p-kyuko-only-rishu');
      const hintEl  = document.getElementById('p-kyuko-rishu-hint');

      // ── 内部状態 ──
      // *Raw: null = API 未受信、[] 以上 = 受信済み
      // rishuToken: "{userId}_isRishu" 形式。最初の API 応答時に生成する。
      const state = {
        kkRaw:      null,
        hkRaw:      null,
        kcRaw:      null,
        onlyRishu:  false,
        rishuToken: '',
      };

      // API 応答前はチェックボックスを無効にする
      if (cbRishu) {
        cbRishu.disabled = true;
        cbRishu.checked  = false;
        cbRishu.addEventListener('change', () => {
          state.onlyRishu = !!cbRishu.checked;
          redraw();
        });
      }

      // ────────────────────────────────────────────
      // アンカースクロール（オーバーレイ内の #id リンク）
      // ────────────────────────────────────────────

      root.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a || !root.contains(a)) return;
        const id = (a.getAttribute('href') || '').slice(1);
        if (!id) return;
        let target;
        try {
          target = root.querySelector(`#${CSS.escape(id)}`);
        } catch (err) {
          return;
        }
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      // ────────────────────────────────────────────
      // フィルタリングと描画
      // ────────────────────────────────────────────

      /**
       * 現在の state を反映した表示リスト（3 種）を返す。
       *
       * @returns {{ kk: object[], hk: object[], kc: object[] }}
       */
      function applyFilter() {
        const token = state.onlyRishu && state.rishuToken ? state.rishuToken : '';
        return {
          kk: token
            ? filterByRishuToken(state.kkRaw, token, {
                rishu: 'gakuseiRishuFlgKyuko', rishuUnder: '_gakuseiRishuFlgKyuko', kyoin: '_kyoinCds',
              })
            : (state.kkRaw || []).slice(),
          hk: token
            ? filterByRishuToken(state.hkRaw, token, {
                rishu: 'gakuseiRishuFlgHoko', rishuUnder: '_gakuseiRishuFlgHoko',
                kyoin: '_hokoKyoinCds', kyoin2: 'hokoKyoinCds',
              })
            : (state.hkRaw || []).slice(),
          kc: token
            ? filterByRishuToken(state.kcRaw, token, {
                rishu: 'gakuseiRishuFlgKc', rishuUnder: '_gakuseiRishuFlgKc',
                kyoin: '_kcKyoinCds', kyoin2: 'kcKyoinCds',
              })
            : (state.kcRaw || []).slice(),
        };
      }

      /**
       * 1 つの tbody を描画する。
       * rows === null は「未受信（読み込み中）」、[] は「データなし」を意味する。
       *
       * @param {Element | null} el - 描画対象 tbody
       * @param {object[] | null} rows
       * @param {(esc: Function, row: object) => string} rowFn - 行 HTML 生成関数
       * @param {number} cols - colspan の値
       * @param {string} emptyMsg
       * @param {string} loadingMsg
       */
      function renderTbody(el, rows, rowFn, cols, emptyMsg, loadingMsg) {
        if (!el) return;
        if (rows === null) {
          P.setHtml(el, `<tr><td colspan="${cols}"><p class="p-news-empty">${loadingMsg}</p></td></tr>`);
        } else if (rows.length === 0) {
          P.setHtml(el, `<tr><td colspan="${cols}"><p class="p-news-empty">${emptyMsg}</p></td></tr>`);
        } else {
          P.setHtml(el, rows.map((r) => rowFn(P.esc, r)).join(''));
        }
      }

      /**
       * 3 つのテーブルをまとめて再描画する。
       */
      function redraw() {
        const { kk, hk, kc } = applyFilter();
        renderTbody(tbodyK, state.kkRaw === null ? null : kk, rowKyuko, 6, '表示する休講情報はありません。',     '読み込み中…');
        renderTbody(tbodyH, state.hkRaw === null ? null : hk, rowHoko,  7, '表示する補講情報はありません。',     '読み込み中…');
        renderTbody(tbodyC, state.kcRaw === null ? null : kc, rowKc,    8, '表示する教室変更情報はありません。', '読み込み中…');
      }

      // 初回描画（全テーブルが「読み込み中」状態）してから API をリクエストする
      redraw();
      P.pageFetch(P.urls.kyukoInfo(nendo));
      P.pageFetch(P.urls.hokoInfo(nendo));
      P.pageFetch(P.urls.kyoshitsuChange(nendo));

      // ────────────────────────────────────────────
      // メッセージハンドラー
      // ────────────────────────────────────────────

      /**
       * 受信したデータを state に格納して再描画する。
       * 最初の応答から userId を取得して履修フィルタートークンを初期化する。
       *
       * @param {'kkRaw' | 'hkRaw' | 'kcRaw'} key
       * @param {unknown} items
       * @returns {boolean}
       */
      function setRaw(key, items) {
        if (!Array.isArray(items)) return false;
        state[key] = items;

        // 最初の応答から userId を取得して履修トークンを生成する（1回のみ）
        if (!state.rishuToken) {
          const uid = firstUserIdFromItems(items);
          if (uid) {
            state.rishuToken = `${uid}_isRishu`;
            state.onlyRishu  = true;
            if (cbRishu) { cbRishu.disabled = false; cbRishu.checked = true; }
            if (hintEl)  hintEl.hidden = true;
          }
        }

        redraw();
        return true;
      }

      return {
        /** @param {{ items: unknown }} d */
        onKyukoInfo:       (d) => setRaw('kkRaw', d.items),
        /** @param {{ items: unknown }} d */
        onHokoInfo:        (d) => setRaw('hkRaw', d.items),
        /** @param {{ items: unknown }} d */
        onKyoshitsuChange: (d) => setRaw('kcRaw', d.items),
      };
    },
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
