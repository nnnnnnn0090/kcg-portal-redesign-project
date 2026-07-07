/** DOM ID / class 凍結値（§4.4.4 / §10.1）。 */

export const PORTAL_DOM = {
  bootCover: 'kcg-portal-boot-cover' /* 起動フラッシュ防止＋オーバーレイ下の固定背景 */,
  headThemeStyle: 'portal-theme-vars',
  overlayRoot: 'portal-overlay',
  overlayCss: 'portal-overlay-css',
  /** Home2 Mail ログイン画面でホスト側の重複 UI を隠す runtime CSS carrier */
  home2HostTweak: 'kcg-portal-home2-host-tweak',
} as const;

/** `#portal-overlay` に付与。Home2 Web Mail のとき（ホストのフォントを継承する CSS 用） */
export const HOME2_MAIL_OVERLAY_SURFACE_CLASS = 'p-surface-home2-mail' as const;

/** `#portal-overlay` に付与。`/Mail/*` でヘッダー帯のみのとき */
export const HOME2_MAIL_OVERLAY_HEADER_ONLY_CLASS = 'p-surface-home2-mail-header-only' as const;

/** portal.content: ブートカバーを外すまでの requestAnimationFrame 段階 */
export const PORTAL_BOOT_COVER_RAF_FRAMES = {
  withToast: 5,
  default: 3,
} as const;

/** King LMS 同期オーバーレイ DOM ID 群 */
export const KING_LMS_SYNC_DOM = {
  overlay: 'kcg-portal-ext-sync-overlay',
  loginHint: 'kcg-portal-ext-login-hint',
  style: 'kcg-portal-ext-sync-overlay-style',
  scrollLockClass: 'kcg-portal-ext-scroll-locked',
} as const;

/** ポータル surface class */
export const PORTAL_SURFACE_CLASS = 'kcg-portal-surface' as const;

/** Cplan surface class */
export const CPLAN_SURFACE_CLASS = 'p-surface-cplan' as const;

/** adoptedStyleSheets フォールバック style ノード ID */
export const RUNTIME_CSS_FALLBACK_ID = 'kcg-portal-runtime-css' as const;

/** Cplan runtime style キー */
export const CPLAN_RUNTIME_STYLE_KEY = 'portal-cplan-runtime' as const;
