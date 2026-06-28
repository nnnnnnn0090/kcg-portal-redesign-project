/**
 * 拡張機能全体で共有する定数です。
 * `chrome.storage.local` のキー（`SK`）、ページ識別子（`PAGE`）、`postMessage` 種別（`MSG` など）をここに集約しています。
 */

// ─── chrome.storage.local のキー ───────────────────────────────────────────

export const SK = {
  kinoEmptyForce:                   'portalThemeKinoForceShowEmpty',
  hoshuCalForce:                    'portalThemeHoshuCalForceShow',
  campusCalForce:                   'portalThemeCampusCalForceShow',
  hideProfileName:                  'portalThemeHideProfileName',
  theme:                            'portalThemeColorTheme',
  showKogiCalMascot:                'portalThemeShowKogiCalMascot',
  /** ホームの King LMS 連携「課題」カレンダーを表示しない */
  hideAssignmentCalendar:          'portalThemeHideAssignmentCalendar',
  kingLmsCourses:                   'portalThemeKingLmsCourses',
  kingLmsAssignmentDue:             'portalThemeKingLmsAssignmentDue',
  kingLmsSyncPending:               'portalThemeKingLmsSyncPending',
  kingLmsSyncReturnUrl:             'portalThemeKingLmsSyncReturnUrl',
  kingLmsSyncAwaitCourse:           'portalThemeKingLmsSyncAwaitCourse',
  /** 設定パネルからのコース一覧再取得のとき true（戻りトーストを短くする） */
  kingLmsCourseSyncToastQuiet:      'portalThemeKingLmsCourseSyncToastQuiet',
  kingLmsAssignmentSyncPending:     'portalThemeKingLmsAssignmentSyncPending',
  kingLmsAssignmentSyncReturnUrl:   'portalThemeKingLmsAssignmentSyncReturnUrl',
  kingLmsAssignmentSyncAwaitCalendar: 'portalThemeKingLmsAssignmentSyncAwaitCalendar',
  /** 課題同期でホームへ戻った直後、課題カレンダーへスクロールする（読み取り後に false に戻す） */
  portalScrollToAssignmentOnce:   'portalThemeScrollToAssignmentOnce',
  shortcutConfig:                   'portalThemeShortcutConfig',
  /** 初回の案内チュートリアルを完了（またはスキップ）したら true */
  portalGuidedTourDone:             'portalThemePortalGuidedTourDone',
  /** 初回の言語選択を完了したら true */
  portalLanguagePickerDone:         'portalThemePortalLanguagePickerDone',
  home2WebMailOverlay:              'portalThemeHome2WebMailOverlay',
  cplanOverlay:                     'portalThemeCplanOverlay',
  /** カレンダーグリッドの週の左端: `monday` | `sunday` */
  calendarWeekStart:               'portalThemeCalendarWeekStart',
  /** 拡張 UI の表示言語 */
  language:                        'portalThemeLanguage',
  /** 更新通知済みの拡張 manifest version（`readExtensionVersion()` と比較） */
  extensionVersionSeen:            'portalThemeExtensionVersionSeen',
  /** 開発者お知らせパネルの表示言語（`ja` / `en` / `zh` / `zh_TW` / `ko` / `vi` / `ne` / `id` / `th`） */
  developerNoticeLang:             'portalThemeDeveloperNoticeLang',
  /** 開発者アンケートの回答済み状態（`surveyId:revision` の配列） */
  developerSurveyAnswered:         'portalThemeDeveloperSurveyAnswered',
  /** 拡張機能インストールごとに1つ発行する匿名ユーザー ID（notice.json 等の識別用） */
  clientUserId:                    'portalThemeClientUserId',
  /** 拡張の初回記録日時（ISO 8601） */
  clientInstallAt:                 'portalThemeClientInstallAt',
  /** 拡張の最終バージョン更新日時（ISO 8601） */
  clientLastUpdatedAt:             'portalThemeClientLastUpdatedAt',
  /** ライフサイクル追跡用の最後に記録した manifest version */
  clientLastKnownVersion:          'portalThemeClientLastKnownVersion',
} as const;

// ─── King LMS postMessage（hooks → bridge）──────────────────────────────────

export const KING_LMS_HOOK = {
  source:          'portalThemeKingLmsHook',
  syncAbortType:   'portalThemeKingLmsSyncAbort',
  coursesPostType:   SK.kingLmsCourses,
  assignmentDuePostType: SK.kingLmsAssignmentDue,
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
  bootCover:       'kcg-portal-boot-cover', /* 起動フラッシュ防止＋オーバーレイ下の固定背景 */
  headThemeStyle: 'portal-theme-vars',
  overlayRoot:    'portal-overlay',
  overlayCss:     'portal-overlay-css',
  /** Home2 Mail ログイン画面でホスト側の重複 UI を隠す style タグ */
  home2HostTweak: 'kcg-portal-home2-host-tweak',
} as const;

/** `#portal-overlay` に付与。Home2 Web Mail のとき（ホストのフォントを継承する CSS 用） */
export const HOME2_MAIL_OVERLAY_SURFACE_CLASS = 'p-surface-home2-mail' as const;

/** `#portal-overlay` に付与。`/Mail/*` でヘッダー帯のみのとき */
export const HOME2_MAIL_OVERLAY_HEADER_ONLY_CLASS = 'p-surface-home2-mail-header-only' as const;

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

/** Campus Plan Web（パス先頭の大文字・小文字違いを含む） */
export const CPLAN_CONTENT_SCRIPT_MATCHES = [
  `${PORTAL_ORIGIN}/gakusei/web/CplanMenuWeb/UI/*`,
  `${PORTAL_ORIGIN}/Gakusei/web/CplanMenuWeb/UI/*`,
  `${PORTAL_ORIGIN}/gakusei/web/skt/WebSktGakuseiShukketsuShinsei/UI/*`,
  `${PORTAL_ORIGIN}/Gakusei/web/skt/WebSktGakuseiShukketsuShinsei/UI/*`,
] as const;

/** Home2 Web メール（専用 content script） */
export const HOME2_ORIGIN = 'https://home2.kcg.ac.jp' as const;

export const HOME2_HOSTNAME = new URL(HOME2_ORIGIN).hostname;

/** `/Mail`・`/Mail/`・`/Mail/*` いずれにもマッチさせる */
export const HOME2_MAIL_CONTENT_SCRIPT_MATCHES = [
  `${HOME2_ORIGIN}/Mail`,
  `${HOME2_ORIGIN}/Mail/`,
  `${HOME2_ORIGIN}/Mail/*`,
] as const;

export const HOME2_MAIL_DEFAULT_URL = `${HOME2_ORIGIN}/Mail/Default.aspx` as const;

export const HOME2_MAIL_DIRECTORY_URL = `${HOME2_ORIGIN}/Mail/` as const;

/** ヘッダー「ホーム」→ Default.aspx */
export const HOME2_TOP_PAGE_URL = `${HOME2_ORIGIN}/Default.aspx` as const;

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
  /** 学ポータル本体 `li.logoff` のログアウト（MAIN ワールドで実行） */
  logoffTrigger: 'portalThemeLogoffTrigger',
} as const;

/** `window` で発火。`X-CPAuthorize` がキャプチャされたあと pageFetch ブリッジが待機解除する */
export const PORTAL_CP_AUTHORIZE_READY = 'portalCpAuthorizeReady' as const;

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
export const KING_LMS_ASSIGNMENT_SYNC_URL = `${KING_LMS_ORIGIN}/ultra/calendar` as const;
/** 拡張紹介ページ・開発者お知らせ JSON のオリジン（host_permissions と URL 生成用） */
export const EXTENSION_PROMO_ORIGIN = 'https://kcg-portal-redesign-project-web.vercel.app' as const;

/** 拡張機能紹介ページ */
export const EXTENSION_PROMO_PAGE_URL = `${EXTENSION_PROMO_ORIGIN}/` as const;

/** ホーム最上部「開発者からのお知らせ」用 Markdown JSON（`title` / `message`） */
export const DEVELOPER_NOTICE_JSON_URL = `${EXTENSION_PROMO_ORIGIN}/notice_md.json` as const;

/** ホーム最上部「開発者アンケート」用 JSON */
export const DEVELOPER_SURVEY_JSON_URL = `${EXTENSION_PROMO_ORIGIN}/survey.json` as const;

/** 開発者アンケート回答送信用エンドポイント */
export const DEVELOPER_SURVEY_RESPONSE_URL = `${EXTENSION_PROMO_ORIGIN}/survey-response` as const;

/** notice.json 等へ付与する匿名ユーザー識別子ヘッダー */
export const CLIENT_USER_ID_HEADER = 'X-KCG-Portal-User-Id' as const;

/** notice.json 等へ付与する拡張機能バージョンヘッダー（manifest version） */
export const EXTENSION_VERSION_HEADER = 'X-KCG-Portal-Extension-Version' as const;

/** notice.json 等へ付与するインストール日時ヘッダー（ISO 8601） */
export const CLIENT_INSTALL_AT_HEADER = 'X-KCG-Portal-Install-At' as const;

/** notice.json 等へ付与する最終更新日時ヘッダー（ISO 8601） */
export const CLIENT_LAST_UPDATED_AT_HEADER = 'X-KCG-Portal-Last-Updated-At' as const;

/** extension-update 通知へ付与する更新前バージョンヘッダー */
export const CLIENT_PREVIOUS_VERSION_HEADER = 'X-KCG-Portal-Previous-Version' as const;

/** 拡張バージョン更新時に Web へ通知するエンドポイント（Web 側で Discord 通知） */
export const EXTENSION_UPDATE_NOTIFY_URL = `${EXTENSION_PROMO_ORIGIN}/extension-update` as const;

/** 設定の「チェンジログ」用・利用者向け更新履歴 JSON */
export const CHANGELOG_JSON_URL = `${EXTENSION_PROMO_ORIGIN}/changelog.json` as const;

/** フッタークレジットの作者プロフィール（X） */
export const EXTENSION_AUTHOR_PROFILE_URL = 'https://x.com/nnnnnnn0090';

/** `Redesigned by` のリンク文言（`EXTENSION_AUTHOR_PROFILE_URL` と対） */
export const EXTENSION_AUTHOR_CREDIT_TEXT = 'nnnnnnn0090' as const;

function vitePrivateUrl(key: 'VITE_PORTAL_DISCORD_INVITE_URL' | 'VITE_EXTENSION_FEEDBACK_FORM_URL'): string {
  const raw = import.meta.env[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Discord 招待 URL。`VITE_PORTAL_DISCORD_INVITE_URL` を `app/.env.local` などに書きビルドする（Git に含めない）。
 * 未設定・空のときは設定パネルに Discord ボタンを出さない。
 */
export const PORTAL_COMMUNITY_DISCORD_INVITE_URL = vitePrivateUrl('VITE_PORTAL_DISCORD_INVITE_URL');

/**
 * バグ報告・機能リクエスト用フォーム URL。`VITE_EXTENSION_FEEDBACK_FORM_URL` を同様に設定。
 * 未設定のときはフォーム用ボタンを出さない。
 */
export const EXTENSION_FEEDBACK_FORM_URL = vitePrivateUrl('VITE_EXTENSION_FEEDBACK_FORM_URL');

// ─── ホームのショートカットに常に含める固定リンク ──────────────────────────

export const HOME_SHORTCUT_EXTRAS: ReadonlyArray<{ readonly midashi: string; readonly url: string }> = [
  {
    midashi: '学生出欠登録',
    url: `${PORTAL_ORIGIN}/gakusei/web/skt/WebSktGakuseiShukketsuShinsei/UI/WSK_GakuseiShukketsuShinsei.aspx`,
  },
  {
    midashi: 'KCG WebMail',
    url:     HOME2_MAIL_DIRECTORY_URL,
  },
];
