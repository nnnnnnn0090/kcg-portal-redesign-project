/// <reference types="vite/client" />

/** Vite がビルド時に埋め込む環境変数（`.env` / `.env.local` など。リポジトリには秘密を含めない） */
interface ImportMetaEnv {
  /** Discord 招待 URL（`app/.env.local` などで設定。リポジトリに含めない） */
  readonly VITE_PORTAL_DISCORD_INVITE_URL?: string;
  /** バグ報告・機能リクエスト用フォーム URL */
  readonly VITE_EXTENSION_FEEDBACK_FORM_URL?: string;
  /** マスコットイラスト制作者の表示名 */
  readonly VITE_MASCOT_ILLUSTRATOR_NAME?: string;
  /** マスコットイラスト制作者のプロフィール URL */
  readonly VITE_MASCOT_ILLUSTRATOR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
