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
  /** 初回の案内チュートリアルを完了（またはスキップ）したら true */
  portalGuidedTourDone:             'portalThemePortalGuidedTourDone',
} as const;

export type StorageKey = (typeof SK)[keyof typeof SK];

// ─── King LMS postMessage（hooks → bridge）──────────────────────────────────

export const KING_LMS_HOOK = {
  source:          'portalThemeKingLmsHook',
  syncAbortType:   'portalThemeKingLmsSyncAbort',
  coursesPostType:   SK.kingLmsCourses,
  streamsDuePostType: SK.kingLmsStreamsUltraDue,
} as const;

// ─── ポータルページ識別子 ────────────────────────────────────────────────────

export const PAGE = {
  HOME:   'home',
  NEWS:   'news',
  DETAIL: 'detail',
  KYUKO:  'kyuko',
  SURVEY: 'survey',
} as const;

export type PageType = (typeof PAGE)[keyof typeof PAGE];

// ─── ポータル boot / オーバーレイの element id（early / content / themes で共有） ─

export const PORTAL_DOM = {
  bootCover:       'kcg-portal-boot-cover',
  headThemeStyle: 'portal-theme-vars',
  overlayRoot:    'portal-overlay',
  overlayCss:     'portal-overlay-css',
} as const;

/** portal.content: ブートカバーを外すまでの requestAnimationFrame 段階 */
export const PORTAL_BOOT_COVER_RAF_FRAMES = {
  withToast: 5,
  default:   3,
} as const;

/** 学生ポータル（拡張の主対象オリジン） */
export const PORTAL_ORIGIN = 'https://home.kcg.ac.jp' as const;

/** `location.hostname` 比較用 */
export const PORTAL_HOSTNAME = new URL(PORTAL_ORIGIN).hostname;

/** ポータル配下コンテンツスクリプトの manifest `matches` */
export const PORTAL_CONTENT_SCRIPT_MATCHES = `${PORTAL_ORIGIN}/portal*` as const;

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
  /** postMessage の source（fetch フック由来） */
  source:        'portalThemeFetchObserver',
  /** キャプチャ済みメッセージの再送要求 */
  replayRequest: 'portalThemeReplayIntercepted',
  /** pageFetch 依頼 */
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

/** King LMS のオリジン（コースリンク・課題リンク・コンテンツスクリプト matches に使用） */
export const KING_LMS_ORIGIN = 'https://king-lms.kcg.edu' as const;

/** `location.hostname` 比較用（KING_LMS_ORIGIN と一致） */
export const KING_LMS_HOSTNAME = new URL(KING_LMS_ORIGIN).hostname;

/** King LMS コース同期のエントリ URL（授業カレンダー → King LMS リンク用） */
export const KING_LMS_COURSE_SYNC_URL = `${KING_LMS_ORIGIN}/ultra/course` as const;

/** King LMS 課題同期のエントリ URL */
export const KING_LMS_ASSIGNMENT_SYNC_URL = `${KING_LMS_ORIGIN}/ultra/stream` as const;
/** 拡張機能紹介ページ */
export const EXTENSION_PROMO_PAGE_URL = 'https://kcg-portal-redesign-project-web.vercel.app/';

/** フッタークレジットの作者プロフィール（X） */
export const EXTENSION_AUTHOR_PROFILE_URL = 'https://x.com/nnnnnnn0090';

// ─── ホームのショートカットに常に含める固定リンク ──────────────────────────

export const HOME_SHORTCUT_EXTRAS: ReadonlyArray<{ readonly midashi: string; readonly url: string }> = [
  {
    midashi: '学生出欠登録',
    url: `${PORTAL_ORIGIN}/gakusei/web/skt/WebSktGakuseiShukketsuShinsei/UI/WSK_GakuseiShukketsuShinsei.aspx`,
  },
];
