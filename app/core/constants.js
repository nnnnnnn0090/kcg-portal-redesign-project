/**
 * core/constants.js — 全定数の一元管理
 *
 * ロード順: document_idle（core/dom.js, core/date.js の後）。
 *
 * ここに定義した定数は変更すると既存ユーザーのデータ（settings）に影響するものが多い。
 * 特に SK（ストレージキー）は変更するとユーザーの設定がリセットされるため、慎重に扱う。
 *
 * 公開: P.SK, P.KINO_ID, P.PAGE, P.MSG, P.FETCH_HOOK,
 *        P.HOME_SHORTCUT_EXTRAS, P.KING_LMS_COURSE_SYNC_URL, P.KING_LMS_ASSIGNMENT_SYNC_URL,
 *        P.KING_LMS_SYNC_DONE_HASH, P.KING_LMS_ASSIGNMENT_SYNC_DONE_HASH,
 *        P.KING_LMS_ASSIGNMENT_SYNC_TIMEOUT_HASH, P.KING_LMS_ASSIGNMENT_SYNC_ERROR_HASH, P.KING_LMS_SYNC_TIMEOUT_HASH,
 *        P.EXTENSION_PROMO_PAGE_URL
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // ────────────────────────────────────────────
  // ストレージキー
  //
  // browser.storage.local に保存する設定値のキー名。
  // SK.theme は early/theme.js の THEME_STORAGE_KEY と同一文字列でなければならない。
  // ────────────────────────────────────────────

  /**
   * @type {Record<string, string>}
   */
  const SK = {
    kinoEmptyForce:       'portalThemeKinoForceShowEmpty',    // お知らせを空でも強制表示
    hoshuCalForce:        'portalThemeHoshuCalForceShow',      // 補修カレンダーを空でも強制表示
    campusCalForce:       'portalThemeCampusCalForceShow',     // キャンパスカレンダーを空でも強制表示
    hideProfileName:      'portalThemeHideProfileName',        // ヘッダーの名前を非表示
    theme:                'portalThemeColorTheme',             // テーマ名（THEME_STORAGE_KEY と同一）
    calLinkKingLms:       'portalThemeCalLinkKingLms',         // 授業カレンダー講義リンクを King LMS へ
    kingLmsCourses:       'portalThemeKingLmsCourses',         // King LMS のコース一覧キャッシュ
    kingLmsStreamsUltraDue: 'portalThemeKingLmsStreamsUltraDue', // streams/ultra 由来の期日付き項目（{ items, capturedAt }）
    kingLmsSyncPending:   'portalThemeKingLmsSyncPending',     // King LMS コース同期中フラグ
    kingLmsSyncReturnUrl: 'portalThemeKingLmsSyncReturnUrl',   // コース同期後の戻り先 URL
    kingLmsSyncAwaitCourse: 'portalThemeKingLmsSyncAwaitCourse', // ログイン後コース画面待機フラグ
    kingLmsAssignmentSyncPending:   'portalThemeKingLmsAssignmentSyncPending',   // 課題同期中フラグ
    kingLmsAssignmentSyncReturnUrl: 'portalThemeKingLmsAssignmentSyncReturnUrl', // 課題同期後の戻り先 URL
    shortcutConfig:       'portalThemeShortcutConfig',           // ショートカットのカスタム設定（JSON）
  };

  // ────────────────────────────────────────────
  // ポータルキノメッセージ ID
  //
  // PortalKinoMessage API の id パラメータ。ページごとに異なる。
  // ────────────────────────────────────────────

  const KINO_ID = {
    home:   7,   // ホームページ
    news:   8,   // お知らせ一覧ページ
    survey: 16,  // アンケートページ
  };

  // ────────────────────────────────────────────
  // ページタイプ定数
  //
  // main.js のルーターと boot.js の分岐に使う。
  // 文字列値は任意だが変更しないこと。
  // ────────────────────────────────────────────

  const PAGE = {
    HOME:   'home',
    NEWS:   'news',
    DETAIL: 'detail',
    KYUKO:  'kyuko',
    SURVEY: 'survey',
  };

  // ────────────────────────────────────────────
  // postMessage タイプ定数（MSG）
  //
  // hooks/portal-fetch-hook.js と boot.js のメッセージ配送テーブルで使う。
  // フックと受信側で同じ定数を参照することで、タイポによるバグを防ぐ。
  // ────────────────────────────────────────────

  const MSG = {
    kinoMessage:        'portalThemePortalKinoMessageCaptured',
    kogiCalendar:       'portalThemeKogiCalendarCaptured',
    hoshuCalendar:      'portalThemeHoshuCalendarCaptured',
    campusCalendar:     'portalThemeCampusCalendarCaptured',
    kyukoInfo:          'portalThemeKyukoInfoCaptured',
    hokoInfo:           'portalThemeHokoInfoCaptured',
    kyoshitsuChange:    'portalThemeKyoshitsuChangeInfoCaptured',
    questionnaireInfo:  'portalThemeQuestionnaireInfoCaptured',
    deliveredNewsDetail:'portalThemeDeliveredNewsDetailCaptured',
    deliveredNews:      'portalThemeDeliveredNewsCaptured',
    newTopics:          'portalThemeNewTopicsCaptured',
    kogiNews:           'portalThemeKogiNewsCaptured',
    userHtmlLink:       'portalThemeUserHtmlLinkCaptured',
  };

  // ────────────────────────────────────────────
  // fetch フック識別子
  //
  // hooks/portal-fetch-hook.js の TAG / REPLAY_REQUEST と値を一致させること。
  // ────────────────────────────────────────────

  const FETCH_HOOK = {
    source:        'portalThemeFetchObserver',
    replayRequest: 'portalThemeReplayIntercepted',
  };

  // ────────────────────────────────────────────
  // アプリ固有の定数
  // ────────────────────────────────────────────

  /**
   * ホームページの「ショートカット」に追加する固定リンク。
   * UserHtmlLink API のレスポンスに同一 URL がある場合は重複を除去する。
   * @type {Array<{ midashi: string, url: string }>}
   */
  const HOME_SHORTCUT_EXTRAS = [
    {
      midashi: '学生出欠登録',
      url: 'https://home.kcg.ac.jp/gakusei/web/skt/WebSktGakuseiShukketsuShinsei/UI/WSK_GakuseiShukketsuShinsei.aspx',
    },
  ];

  /** King LMS コース同期のリダイレクト先 URL */
  const KING_LMS_COURSE_SYNC_URL = 'https://king-lms.kcg.edu/ultra/course';

  /** King LMS 課題同期のリダイレクト先 URL */
  const KING_LMS_ASSIGNMENT_SYNC_URL = 'https://king-lms.kcg.edu/ultra/stream';

  /**
   * コース同期完了後にポータルへ戻るときの location.hash（先頭 # は付けない）。
   * bridges/king-lms-bridge.js のリダイレクトと同一文字列であること。
   */
  const KING_LMS_SYNC_DONE_HASH = 'portal-king-lms-sync-ok';

  /** 課題同期完了後の location.hash */
  const KING_LMS_ASSIGNMENT_SYNC_DONE_HASH = 'portal-king-lms-assignment-sync-ok';

  /** 課題同期がタイムアウトしたときの location.hash（オーバーレイ解除・ポータルへ戻す） */
  const KING_LMS_ASSIGNMENT_SYNC_TIMEOUT_HASH = 'portal-king-lms-assignment-sync-timeout';

  /** streams/ultra の読み取り失敗時（パース失敗・仕様変更など）の location.hash */
  const KING_LMS_ASSIGNMENT_SYNC_ERROR_HASH = 'portal-king-lms-assignment-sync-error';

  /** コース同期がタイムアウトしたときの location.hash */
  const KING_LMS_SYNC_TIMEOUT_HASH = 'portal-king-lms-sync-timeout';

  /** 拡張機能の紹介ページ URL（シェアボタンでコピーする） */
  const EXTENSION_PROMO_PAGE_URL = 'https://kcg-portal-redesign-project-web.vercel.app/';

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  Object.assign(P, {
    SK, KINO_ID, PAGE, MSG, FETCH_HOOK,
    HOME_SHORTCUT_EXTRAS,
    KING_LMS_COURSE_SYNC_URL,
    KING_LMS_ASSIGNMENT_SYNC_URL,
    KING_LMS_SYNC_DONE_HASH,
    KING_LMS_ASSIGNMENT_SYNC_DONE_HASH,
    KING_LMS_ASSIGNMENT_SYNC_TIMEOUT_HASH,
    KING_LMS_ASSIGNMENT_SYNC_ERROR_HASH,
    KING_LMS_SYNC_TIMEOUT_HASH,
    EXTENSION_PROMO_PAGE_URL,
  });

})(typeof globalThis !== 'undefined' ? globalThis : window);
