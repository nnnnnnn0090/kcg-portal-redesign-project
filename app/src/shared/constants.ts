/**
 * 拡張機能全体で共有する定数。
 * ストレージキー（SK）・ページ識別子（PAGE）・メッセージ種別（MSG）などを一元管理する。
 */

// ─── chrome.storage.local のキー ───────────────────────────────────────────

export const SK = {
  kinoEmptyForce:                   'portalThemeKinoForceShowEmpty',
  hoshuCalForce:                    'portalThemeHoshuCalForceShow',
  campusCalForce:                   'portalThemeCampusCalForceShow',
  hideProfileName:                  'portalThemeHideProfileName',
  theme:                            'portalThemeColorTheme',
  showKogiCalMascot:                'portalThemeShowKogiCalMascot',
  kingLmsCourses:                   'portalThemeKingLmsCourses',
  kingLmsStreamsUltraDue:           'portalThemeKingLmsStreamsUltraDue',
  kingLmsSyncPending:               'portalThemeKingLmsSyncPending',
  kingLmsSyncReturnUrl:             'portalThemeKingLmsSyncReturnUrl',
  kingLmsSyncAwaitCourse:           'portalThemeKingLmsSyncAwaitCourse',
  /** 設定パネルからのコース一覧再取得のとき true（戻りトーストを短くする） */
  kingLmsCourseSyncToastQuiet:      'portalThemeKingLmsCourseSyncToastQuiet',
  kingLmsAssignmentSyncPending:     'portalThemeKingLmsAssignmentSyncPending',
  kingLmsAssignmentSyncReturnUrl:   'portalThemeKingLmsAssignmentSyncReturnUrl',
  kingLmsAssignmentSyncAwaitStream: 'portalThemeKingLmsAssignmentSyncAwaitStream',
  shortcutConfig:                   'portalThemeShortcutConfig',
} as const;

export type StorageKey = (typeof SK)[keyof typeof SK];

// ─── ポータルページ識別子 ────────────────────────────────────────────────────

export const PAGE = {
  HOME:   'home',
  NEWS:   'news',
  DETAIL: 'detail',
  KYUKO:  'kyuko',
  SURVEY: 'survey',
} as const;

export type PageType = (typeof PAGE)[keyof typeof PAGE];

// ─── postMessage type（fetch フックが送るキャプチャ種別）────────────────────

export const MSG = {
  kinoMessage:         'portalThemePortalKinoMessageCaptured',
  kogiCalendar:        'portalThemeKogiCalendarCaptured',
  hoshuCalendar:       'portalThemeHoshuCalendarCaptured',
  campusCalendar:      'portalThemeCampusCalendarCaptured',
  kyukoInfo:           'portalThemeKyukoInfoCaptured',
  hokoInfo:            'portalThemeHokoInfoCaptured',
  kyoshitsuChange:     'portalThemeKyoshitsuChangeInfoCaptured',
  questionnaireInfo:   'portalThemeQuestionnaireInfoCaptured',
  deliveredNewsDetail: 'portalThemeDeliveredNewsDetailCaptured',
  deliveredNews:       'portalThemeDeliveredNewsCaptured',
  newTopics:           'portalThemeNewTopicsCaptured',
  kogiNews:            'portalThemeKogiNewsCaptured',
  userHtmlLink:        'portalThemeUserHtmlLinkCaptured',
} as const;

export type MsgType = (typeof MSG)[keyof typeof MSG];

// ─── fetch インターセプト用 postMessage 識別子 ─────────────────────────────

export const FETCH_HOOK = {
  /** portal-hooks.content が送るメッセージの source フィールド値 */
  source:        'portalThemeFetchObserver',
  /** 隔離ワールドがキャプチャ済みメッセージの再送を要求する type */
  replayRequest: 'portalThemeReplayIntercepted',
  /** 隔離ワールドが MAIN world に fetch 実行を依頼する type */
  pageFetch:     'portalThemePageFetchRequest',
} as const;

// ─── キノメッセージ ID ────────────────────────────────────────────────────

export const KINO_ID = {
  home:   7,
  news:   8,
  survey: 16,
} as const;

// ─── King LMS 同期ハッシュ（location.hash で結果を伝達する） ───────────────

export const SYNC_HASH = {
  courseDone:         'portal-king-lms-sync-ok',
  courseTimeout:      'portal-king-lms-sync-timeout',
  assignmentDone:     'portal-king-lms-assignment-sync-ok',
  assignmentTimeout:  'portal-king-lms-assignment-sync-timeout',
  assignmentError:    'portal-king-lms-assignment-sync-error',
} as const;

// ─── 外部 URL ────────────────────────────────────────────────────────────────

/** King LMS のオリジン（コースリンク・課題リンク生成に使用） */
export const KING_LMS_ORIGIN              = 'https://king-lms.kcg.edu';
/** King LMS コース同期のエントリ URL（授業カレンダー → King LMS リンク用） */
export const KING_LMS_COURSE_SYNC_URL     = 'https://king-lms.kcg.edu/ultra/course';
/** King LMS 課題同期のエントリ URL */
export const KING_LMS_ASSIGNMENT_SYNC_URL = 'https://king-lms.kcg.edu/ultra/stream';
/** 拡張機能紹介ページ */
export const EXTENSION_PROMO_PAGE_URL     = 'https://kcg-portal-redesign-project-web.vercel.app/';

// ─── ホームのショートカットに常に含める固定リンク ──────────────────────────

export const HOME_SHORTCUT_EXTRAS: Array<{ midashi: string; url: string }> = [
  {
    midashi: '学生出欠登録',
    url: 'https://home.kcg.ac.jp/gakusei/web/skt/WebSktGakuseiShukketsuShinsei/UI/WSK_GakuseiShukketsuShinsei.aspx',
  },
];
