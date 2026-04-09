/**
 * pages/survey.js — 授業評価アンケートページ
 *
 * ロード順: document_idle（pages/kyuko.js の後）。
 *
 * 役割:
 *   1. ページ HTML テンプレートを提供する（getHtml）
 *   2. setup() で API をリクエストし、
 *      メッセージハンドラー { onQuestionnaireInfo } を返す
 *
 * フィルター:
 *   - 未回答のみ（デフォルト ON）
 *   - 講義名キーワード
 *   - 担当教員キーワード
 *
 * 公開: P.pages.survey.getHtml(), P.pages.survey.setup()
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});
  P.pages = P.pages || {};

  // API の existsAnswer フィールドに含まれる未回答ラベル
  const UNANSWER_LABEL = '未回答';

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

  /**
   * pick と同様だが空文字トリムを行わない（フラグ値の判定に使う）。
   *
   * @param {object | null} obj
   * @param {string[]} keys
   * @returns {string}
   */
  function pickRaw(obj, keys) {
    if (!obj) return '';
    for (const k of keys) {
      if (obj[k] != null) return String(obj[k]);
    }
    return '';
  }

  // ────────────────────────────────────────────
  // 表示用変換
  // ────────────────────────────────────────────

  /**
   * 締切日時文字列を「yyyy年MM月dd日 HH:mm」形式に変換する。
   * パースできない場合はそのまま返す。
   *
   * @param {string} raw
   * @returns {string}
   */
  function formatDeadline(raw) {
    const s = String(raw || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?/);
    return m ? `${m[1]}年${m[2]}月${m[3]}日 ${m[4]}:${m[5]}` : s;
  }

  /**
   * アンケート詳細ページへのリンク URL を生成する。
   *
   * 優先順位:
   *   1. API レスポンスに直接 URL フィールドがある場合はそれを使う
   *   2. 単一 ID から /portal/Questionnaire/Detail/:id を組み立てる
   *   3. 複合キー（年度・実施期間・連番・コード）から組み立てる
   *   4. 生成できない場合は '' を返す（リンクなし）
   *
   * @param {object} row
   * @returns {string}
   */
  function buildDetailHref(row) {
    // 直接 URL フィールド（最優先）
    const direct = pick(row, ['detailUrl','DetailUrl','url','Url','href','Href','link','Link']);
    if (direct) {
      try {
        return /^https?:\/\//i.test(direct)
          ? direct
          : new URL(direct, location.origin).href;
      } catch (e) { /* 無効な URL はスキップ */ }
    }

    // 単一 ID からパスを組み立てる
    const singleId = pick(row, ['detailId','DetailId','questionnaireId','QuestionnaireId','id','Id']);
    if (singleId && /^[0-9A-Za-z-]+$/.test(singleId)) {
      try {
        return new URL(
          `/portal/Questionnaire/Detail/${encodeURIComponent(singleId)}`,
          location.origin,
        ).href;
      } catch (e) { /* 無効な URL はスキップ */ }
    }

    // 複合キーから組み立てる
    const nendo  = pick(row, ['nendo','Nendo']);
    const jisshi = pick(row, ['jisshiKikanCd','JisshiKikanCd','jisshiKikanCD','JissiKikanCd','jissiKikanCd']);
    const renban = pick(row, ['renban','Renban','seq','Seq','renBan']);
    const cd     = pick(row, ['questionnaireCd','QuestionnaireCd','anketoCd','AnketoCd','anketoCD']);
    if (nendo && jisshi && renban && cd) {
      try {
        return new URL(
          `/portal/Questionnaire/Detail/${encodeURIComponent(nendo)}/${encodeURIComponent(jisshi)}/${encodeURIComponent(renban)}/${encodeURIComponent(cd)}`,
          location.origin,
        ).href;
      } catch (e) { /* 無効な URL はスキップ */ }
    }

    return '';
  }

  // ────────────────────────────────────────────
  // フィルタリング
  // ────────────────────────────────────────────

  /**
   * 絞り込み条件を適用して一致する行の配列を返す。
   *
   * @param {object[]} raw - 全件データ
   * @param {boolean} onlyUnanswered - 未回答のみか
   * @param {string} kogiKw - 講義名キーワード
   * @param {string} kyoinKw - 担当教員キーワード
   * @returns {object[]}
   */
  function applyFilters(raw, onlyUnanswered, kogiKw, kyoinKw) {
    let list = Array.isArray(raw) ? raw.slice() : [];

    if (onlyUnanswered) {
      list = list.filter((row) => {
        const ex = pickRaw(row, ['existsAnswer','ExistsAnswer']);
        return ex.length > 0 && ex.includes(UNANSWER_LABEL);
      });
    }

    const fk = kogiKw.trim();
    if (fk) {
      list = list.filter((row) =>
        pick(row, ['kogi','Kogi','kogiNm','KogiNm','kogiName','KogiName']).includes(fk),
      );
    }

    const fe = kyoinKw.trim();
    if (fe) {
      list = list.filter((row) =>
        pick(row, ['kyoinFullNm','KyoinFullNm','tantoKyoinNm','TantoKyoinNm','kyoinNm','KyoinNm','kyoinNms','KyoinNms']).includes(fe),
      );
    }

    return list;
  }

  // ────────────────────────────────────────────
  // 行 HTML
  // ────────────────────────────────────────────

  /**
   * アンケート 1 件の <tr> HTML を生成する。
   * 詳細 URL が取得できた場合は講義名をリンクにする。
   *
   * @param {object} row
   * @returns {string}
   */
  function rowSurvey(row) {
    const kogi     = pick(row, ['kogi','Kogi','kogiNm','KogiNm','kogiName','KogiName']);
    const yobi     = pick(row, ['yobiNm','YobiNm','yobi','Yobi']);
    const jigen    = pick(row, ['jigenNm','JigenNm','jigen','Jigen']);
    const kyoin    = pick(row, ['kyoinFullNm','KyoinFullNm','tantoKyoinNm','TantoKyoinNm','kyoinNm','KyoinNm','kyoinNms','KyoinNms']);
    const deadline = formatDeadline(pick(row, ['summaryDatetime','SummaryDatetime','shimekiri','Shimekiri']));
    const href     = buildDetailHref(row);
    const kogiCell = href
      ? `<a href="${P.escAttr(href)}">${P.esc(kogi)}</a>`
      : P.esc(kogi);

    return `<tr>
  <td>${kogiCell}</td>
  <td>${P.esc(yobi)}</td>
  <td>${P.esc(jigen)}</td>
  <td>${P.esc(kyoin)}</td>
  <td>${P.esc(deadline)}</td>
</tr>`;
  }

  // ────────────────────────────────────────────
  // ページ定義
  // ────────────────────────────────────────────

  P.pages.survey = {

    /**
     * 授業評価アンケートページの HTML 文字列を返す。
     * boot.js が P.setHtml() でオーバーレイルートに流し込む。
     *
     * @returns {string}
     */
    getHtml() {
      return `<main class="p-main p-main-news">
  <div class="p-main-head">
    <h1>授業評価アンケート回答</h1>
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

  <div class="p-news-page p-questionnaire-layout">
    <div class="p-news-primary">
      <section class="p-panel p-news-table-wrap" id="p-questionnaire-section">
        <span class="p-panel-head">アンケート一覧</span>
        <div class="p-questionnaire-subbar">
          <!-- 件数メッセージ: redraw() が更新 -->
          <p class="p-questionnaire-list-title" id="p-questionnaire-list-title"></p>
          <p class="p-questionnaire-list-error" id="p-questionnaire-list-error" hidden></p>
        </div>
        <!-- データ 0 件のとき wrapEl を hidden にしてテーブルを隠す -->
        <div class="p-news-table-scroll" id="p-questionnaire-table-wrap">
          <table class="p-news-table" aria-label="授業評価アンケート一覧">
            <thead>
              <tr>
                <th scope="col">講義</th>
                <th scope="col">曜日</th>
                <th scope="col">時限</th>
                <th scope="col">担当教員</th>
                <th scope="col">締切</th>
              </tr>
            </thead>
            <!-- redraw() がここに行を埋める -->
            <tbody id="p-questionnaire-tbody">
              <tr><td colspan="5"><p class="p-news-empty">読み込み中…</p></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- 絞り込みサイドバー -->
    <aside class="p-news-aside" aria-label="絞り込み">
      <h2 class="p-news-filter-page-title">絞り込み条件</h2>

      <!-- 未回答フィルター（デフォルト ON） -->
      <div class="p-news-mat">
        <h3>表示</h3>
        <ul class="p-news-checklist">
          <li>
            <input type="checkbox" id="p-questionnaire-only-unanswer" checked />
            <label for="p-questionnaire-only-unanswer">未回答のみ</label>
          </li>
        </ul>
      </div>

      <!-- 講義名キーワード -->
      <div class="p-news-mat">
        <h3>講義名</h3>
        <input type="search" class="p-news-kw" id="p-questionnaire-filter-kogi"
               placeholder="キーワード" maxlength="40" autocomplete="off" />
      </div>

      <!-- 担当教員キーワード -->
      <div class="p-news-mat">
        <h3>担当教員</h3>
        <input type="search" class="p-news-kw" id="p-questionnaire-filter-kyoin"
               placeholder="キーワード" maxlength="40" autocomplete="off" />
      </div>

      <div class="p-news-clear">
        <button type="button" class="p-news-clear-btn" id="p-questionnaire-clear">条件クリア</button>
      </div>
    </aside>
  </div>
</main>`;
    },

    /**
     * ページ DOM 準備後に boot.js から呼び出されるセットアップ関数。
     * API をリクエストし、メッセージハンドラーを返す。
     *
     * @returns {{ onQuestionnaireInfo: (d: object) => boolean }}
     */
    setup() {
      const nendo    = P.currentNendo();
      const titleEl  = document.getElementById('p-questionnaire-list-title');
      const errEl    = document.getElementById('p-questionnaire-list-error');
      const wrapEl   = document.getElementById('p-questionnaire-table-wrap');
      const tbody    = document.getElementById('p-questionnaire-tbody');
      const cbUn     = document.getElementById('p-questionnaire-only-unanswer');
      const inKogi   = document.getElementById('p-questionnaire-filter-kogi');
      const inKyoin  = document.getElementById('p-questionnaire-filter-kyoin');
      const btnClear = document.getElementById('p-questionnaire-clear');

      // 生データ（null = 未受信、[] 以上 = 受信済み）
      let raw = null;

      // ────────────────────────────────────────────
      // 描画
      // ────────────────────────────────────────────

      /**
       * 件数に応じたタイトル文字列を返す。
       *
       * @param {number} count
       * @returns {string}
       */
      function listTitle(count) {
        return count > 0
          ? `${nendo}年度の回答期間中の授業評価アンケート一覧を表示しています。`
          : `${nendo}年度の条件に一致する回答期間中の授業評価アンケートはありません。`;
      }

      /**
       * 絞り込みを適用してテーブルを更新する。
       */
      function redraw() {
        if (raw === null) {
          // API 未受信: 読み込み中表示
          if (titleEl) titleEl.textContent = listTitle(0);
          if (errEl)  { errEl.hidden = true; errEl.textContent = ''; }
          if (wrapEl)   wrapEl.hidden = false;
          if (tbody) {
            P.setHtml(tbody, '<tr><td colspan="5"><p class="p-news-empty">読み込み中…</p></td></tr>');
          }
          return;
        }

        const filtered = applyFilters(
          raw,
          !!(cbUn?.checked),
          inKogi?.value  || '',
          inKyoin?.value || '',
        );

        if (titleEl) titleEl.textContent = listTitle(filtered.length);
        if (errEl)  { errEl.hidden = true; errEl.textContent = ''; }

        // 全件 0 件のときテーブル自体を非表示にする
        if (wrapEl) wrapEl.hidden = raw.length === 0;

        if (tbody) {
          if (raw.length === 0) {
            // 全件が 0 件（テーブルは hidden なので問題なし）
            tbody.replaceChildren();
          } else if (filtered.length === 0) {
            P.setHtml(tbody, '<tr><td colspan="5"><p class="p-news-empty">条件に一致するアンケートはありません。</p></td></tr>');
          } else {
            P.setHtml(tbody, filtered.map(rowSurvey).join(''));
          }
        }
      }

      // ────────────────────────────────────────────
      // フィルターイベント配線
      // ────────────────────────────────────────────

      cbUn?.addEventListener('change', redraw);
      inKogi?.addEventListener('input', redraw);
      inKyoin?.addEventListener('input', redraw);

      btnClear?.addEventListener('click', () => {
        if (cbUn)   cbUn.checked  = true;
        if (inKogi)  inKogi.value  = '';
        if (inKyoin) inKyoin.value = '';
        redraw();
      });

      // 初回描画してから API をリクエストする
      redraw();
      P.pageFetch(P.urls.questionnaireInfo());

      // ────────────────────────────────────────────
      // メッセージハンドラー
      // ────────────────────────────────────────────

      return {
        /**
         * アンケート一覧 API のレスポンスを受け取って描画する。
         *
         * @param {{ items: unknown }} d
         * @returns {boolean}
         */
        onQuestionnaireInfo(d) {
          if (!Array.isArray(d.items)) return false;
          raw = d.items;
          redraw();
          return true;
        },
      };
    },
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
