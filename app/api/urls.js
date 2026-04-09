/**
 * api/urls.js — API URL ビルダーと pageFetch
 *
 * ロード順: document_idle（core/storage.js の後）。
 *
 * ポータル API の URL を組み立てる関数と、
 * MAIN world に fetch を委譲する pageFetch を提供する。
 *
 * なぜ pageFetch が必要か:
 *   隔離ワールドでは認証ヘッダーを付与した fetch を直接呼べない。
 *   hooks/portal-fetch-bridge.js（MAIN world）に postMessage で URL を渡し、
 *   そちらで認証ヘッダー付き fetch を実行してもらう。
 *
 * 公開: P.urls, P.pageFetch, P.currentNendo, P.parseCalendarRequest, P.kingLmsCourses, P.kingLmsStreamsUltraDue
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // ────────────────────────────────────────────
  // カレンダー系 URL の共通ビルダー
  // ────────────────────────────────────────────

  /**
   * @param {string} endpoint - API エンドポイント名（例: 'KogiCalendar'）
   * @param {{ uKbn: string, start: string, end: string }} params
   * @returns {string}
   */
  function calUrl(endpoint, params) {
    const u = new URL(`/portal/api/${endpoint}/`, location.origin);
    u.searchParams.set('uKbn',  params.uKbn);
    u.searchParams.set('start', params.start);
    u.searchParams.set('end',   params.end);
    return u.href;
  }

  // ────────────────────────────────────────────
  // API URL ビルダー集
  // ────────────────────────────────────────────

  const urls = {
    /** 授業カレンダー */
    kogiCalendar:   (p) => calUrl('KogiCalendar',   p),
    /** 補修カレンダー */
    hoshuCalendar:  (p) => calUrl('HoshuCalendar',  p),
    /** キャンパスカレンダー */
    campusCalendar: (p) => calUrl('CampusCalendar',  p),

    /** 授業に関するお知らせ（lastLogin は lastLoginDt 要素から取得） */
    kogiNews() {
      const u  = new URL('/portal/api/KogiNews/', location.origin);
      const ll = (document.getElementById('lastLoginDt')?.textContent || '').trim();
      if (ll) u.searchParams.set('lastLogin', ll);
      return u.href;
    },

    /**
     * ポータルキノメッセージ（お知らせパネル）
     * @param {number} id - KINO_ID の値
     */
    kinoMessage(id) {
      const u = new URL('/portal/api/PortalKinoMessage/', location.origin);
      u.searchParams.set('id', String(id));
      return u.href;
    },

    /**
     * お知らせ年度別一覧
     * @param {string | number} nendo
     * @param {string} lastLogin
     */
    deliveredNendo(nendo, lastLogin) {
      const u  = new URL(`/portal/api/DeliveredNews/Nendo/${encodeURIComponent(String(nendo))}/`, location.origin);
      const ll = String(lastLogin || '').trim();
      if (ll) u.searchParams.set('lastLogin', ll);
      return u.href;
    },

    /**
     * お知らせ詳細（ID 指定）
     * @param {string | number} id
     */
    deliveredDetail: (id) =>
      new URL(`/portal/api/DeliveredNews/${encodeURIComponent(String(id))}/`, location.origin).href,

    /**
     * 休講情報（年度指定）
     * @param {string | number} nendo
     */
    kyukoInfo: (nendo) => {
      const u = new URL('/portal/api/KyukoInfo', location.origin);
      u.searchParams.set('nendo', String(nendo));
      return u.href;
    },

    /**
     * 補講情報（年度指定）
     * @param {string | number} nendo
     */
    hokoInfo: (nendo) => {
      const u = new URL('/portal/api/HokoInfo', location.origin);
      u.searchParams.set('nendo', String(nendo));
      return u.href;
    },

    /**
     * 教室変更情報（年度指定）
     * @param {string | number} nendo
     */
    kyoshitsuChange: (nendo) => {
      const u = new URL('/portal/api/KyoshitsuChangeInfo', location.origin);
      u.searchParams.set('nendo', String(nendo));
      return u.href;
    },

    /** アンケート一覧（パラメータなし・認証ヘッダー必須） */
    questionnaireInfo: () =>
      new URL('/portal/api/questionnaireInfo', location.origin).href,
  };

  // ────────────────────────────────────────────
  // pageFetch
  //
  // MAIN world の portal-fetch-bridge.js に URL を postMessage して
  // 認証ヘッダー付き fetch を実行させる。
  // ────────────────────────────────────────────

  /**
   * ポータル API に認証ヘッダー付きリクエストを送る。
   * レスポンスは portal-fetch-hook.js → postMessage → boot.js に届く。
   *
   * @param {string} url
   */
  function pageFetch(url) {
    window.postMessage(
      { type: 'portalThemePageFetchRequest', url: String(url) },
      '*',
    );
  }

  // ────────────────────────────────────────────
  // 学年度計算
  // ────────────────────────────────────────────

  /**
   * 現在の学年度を返す。4〜12月は当年、1〜3月は前年。
   * @returns {number}
   */
  function currentNendo() {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = now.getMonth() + 1;
    return m >= 4 ? y : y - 1;
  }

  // ────────────────────────────────────────────
  // カレンダーリクエスト URL のパース
  //
  // hook が postMessage に requestUrl を含めるため、
  // それを逆パースして { uKbn, start, end } を取り出す。
  // ────────────────────────────────────────────

  /**
   * カレンダー API リクエスト URL から { uKbn, start, end } を取り出す。
   * パースできない場合は null を返す。
   *
   * @param {string} href
   * @returns {{ uKbn: string, start: string, end: string } | null}
   */
  function parseCalendarRequest(href) {
    try {
      const u     = new URL(href, location.origin);
      const start = u.searchParams.get('start');
      const end   = u.searchParams.get('end');
      const uKbn  = u.searchParams.get('uKbn') || '1';
      if (!start || !end) return null;
      return { uKbn, start, end };
    } catch (e) {
      return null;
    }
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  // boot.js がストレージから読み込んで上書きする
  P.kingLmsCourses = [];
  P.kingLmsStreamsUltraDue = null;

  Object.assign(P, { urls, pageFetch, currentNendo, parseCalendarRequest });

})(typeof globalThis !== 'undefined' ? globalThis : window);
