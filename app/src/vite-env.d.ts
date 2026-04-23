/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Discord 招待 URL（`app/.env.local` などで設定。リポジトリに含めない） */
  readonly VITE_PORTAL_DISCORD_INVITE_URL?: string;
  /** バグ報告・機能リクエスト用フォーム URL */
  readonly VITE_EXTENSION_FEEDBACK_FORM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
