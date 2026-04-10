# KCG Portal Redesign Project

京都コンピュータ学院（KCG）の学生向けポータル（`https://home.kcg.ac.jp`）向けの**非公式**ブラウザ拡張です。公式ページの表示を読みやすい UI に差し替えます。

- **スタック**: [WXT](https://wxt.dev/) · React 19 · TypeScript · Manifest V3  
- **バージョン**: `app/package.json` / `wxt.config.ts` の `version` を参照（ストア用メタデータと同期）

---

## 免責事項

- 本拡張は**学校・運営元とは一切関係ありません**。有志によるオープンソースです。
- ポータルや King LMS のサーバーを改変するものではなく、**ブラウザ内で DOM を上書き表示する**拡張です。
- 利用は自己責任でお願いします。不具合やアカウントへの影響について、作者は責任を負いません。

---

## 主な機能

### ページ UI

| ページ | 概要 |
|--------|------|
| ホーム（`/portal`） | カレンダー・お知らせ・ショートカットなどを整理したトップ |
| お知らせ一覧（`/portal/News`） | 一覧の再レイアウト |
| お知らせ詳細（`/portal/News/Detail/:id`） | 記事ビュー |
| 休講・補講・教室変更（`/portal/KyukoHokoEtc`） | 変更情報の見やすい表示 |
| アンケート（`/portal/Questionnaire`） | アンケート画面の再デザイン |

### カレンダー

- **講義カレンダー**（講義コマ・ツールチップ・コンテキストメニューなど）
- **補修・休講・キャンパス**の各カレンダー
- **課題カレンダー** — King LMS の提出期限をストレージ経由で表示

### King LMS 連携

- `king-lms.kcg.edu` 上で MAIN world のフックが通信を捕捉し、隔離ワールドのブリッジが `chrome.storage`（Firefox では `browser.storage`）に保存
- ポータル側の React UI がそのデータを読み取り、課題カレンダーなどに反映
- 同期中のオーバーレイ・タイムアウト・ログインリダイレクト時の扱いを実装済み

### テーマ・設定

- ライト / ダークなど複数テーマ
- ショートカットの編集・並び順
- 設定は拡張の `storage` に保存

---

## 対応ブラウザ

| ブラウザ | 備考 |
|----------|------|
| Google Chrome | MV3（`minimum_chrome_version` は `wxt.config.ts` 参照） |
| Microsoft Edge | 同上 |
| Mozilla Firefox | `wxt.config.ts` の `browser_specific_settings.gecko` を参照 |

---

## 必要環境

- **Node.js**（20 系 LTS 以上を推奨）
- **npm**
- リポジトリルートの **`./build.sh`** を使う場合: **bash**（macOS / Linux 標準、Git Bash 等でも可）

---

## 開発

すべて **`app/` ディレクトリ**で実行します。

```bash
cd app
npm install
```

### ウォッチ開発（未パッケージの読み込み）

```bash
npm run dev          # Chromium 系（既定）
npm run dev:firefox  # Firefox
```

WXT が `app/.output/` にブラウザ別の拡張ディレクトリを出力します。Chrome では「デベロッパーモード」→「パッケージ化されていない拡張機能を読み込む」から、例: `app/.output/chrome-mv3` を指定します。

### ビルドのみ

```bash
npm run build           # Chromium 向け
npm run build:firefox   # Firefox 向け
```

### 品質

```bash
npm run lint
npm run format          # 書き込み
npm run format:check
npm run test            # Vitest
```

### E2E（任意）

実拡張ディレクトリを渡したときだけスモークテストが走ります。

```bash
npm run build
EXTENSION_PATH=.output/chrome-mv3 npm run test:e2e
```

`EXTENSION_PATH` が未設定またはパスが無効な場合、該当スイートはスキップされます。

---

## 配布用 ZIP（リポジトリルート）

リポジトリのルートから:

```bash
./build.sh
```

`app` で `npm run zip` と `npm run zip:firefox` を実行し、生成された **`app/.output/*.zip`** を **`build/`** にコピーします。

---

## リポジトリ構成

**拡張のソースはすべて `app/` 以下**です。次のディレクトリは生成物のためリポジトリに含めません（`.gitignore`）。

- `build/` — ルートの `build.sh` が集約する配布 ZIP
- `app/.output/` — `wxt` のビルド・zip 出力
- `app/.wxt/` — WXT が生成する型定義など
- `app/node_modules/` — npm 依存

以下、**手元のソース・設定ファイルごとに役割**を示します（`node_modules` 等は省略）。

### リポジトリルート

| ファイル | 説明 |
|----------|------|
| `.gitignore` | Git 管理外パス（`build/`、`app/.output` 等）の指定 |
| `LICENSE` | MIT ライセンス本文 |
| `README.md` | 本ドキュメント |
| `build.sh` | `app` で Chrome / Firefox 用 ZIP を生成し、`build/` にコピーするシェル |

### `app/`（プロジェクトルート）

| ファイル | 説明 |
|----------|------|
| `package.json` | 依存関係・npm scripts（`dev` / `build` / `zip` / `lint` / `test` 等） |
| `package-lock.json` | npm のロックファイル |
| `tsconfig.json` | TypeScript コンパイラ設定 |
| `wxt.config.ts` | WXT 設定・拡張 manifest（名前・権限・host_permissions・Gecko ID 等） |
| `eslint.config.mjs` | ESLint フラット設定 |
| `vitest.config.ts` | Vitest の設定 |
| `playwright.config.ts` | Playwright E2E の設定 |

### `app/e2e/`

| ファイル | 説明 |
|----------|------|
| `portal-smoke.spec.ts` | ビルド済み拡張を読み込んだ Chromium で `#portal-overlay` 表示を確認するスモークテスト（`EXTENSION_PATH` 未設定時はスキップ） |

### `app/src/entrypoints/`

WXT のコンテンツスクリプト。各フォルダの `index` がエントリ。

| ファイル | 説明 |
|----------|------|
| `portal-early.content/index.ts` | `document_start` で早期テーマ適用とブートカバー（ちらつき防止） |
| `portal-hooks.content/index.ts` | ポータル origin の **MAIN world** で `fetch` / XHR をフックし、API 結果を隔離ワールドへ `postMessage` |
| `portal.content/index.tsx` | `document_end` で `<head>` 整理・インライン CSS 注入・`#portal-overlay` に React をマウント |
| `king-lms-hooks.content/index.ts` | King LMS 上の **MAIN world** でネットワークフック（コース・課題データの捕捉） |
| `king-lms-bridge.content/index.ts` | King LMS 上の隔離ワールド。`postMessage` を受けて `storage` 保存・同期オーバーレイ・ポータルへのリダイレクト |

### `app/src/portal/`

| ファイル | 説明 |
|----------|------|
| `App.tsx` | オーバーレイアプリのルート。Provider ラップ・ヘッダー / フッター / 設定・トースト・ページアウトレットを統合 |
| `providers.tsx` | `Settings` / `Courses` / `PortalDom` / `CalendarOverlayUi` の Context プロバイダーをまとめる |
| `routes.tsx` | `PortalRoute` に応じたページコンポーネント（ホーム以外は `lazy` + `Suspense`） |
| `router.ts` | 現在 URL から表示すべきポータルページ種別を判定 |
| `sync-hash.ts` | King LMS 同期完了後の `location.hash` の解釈とトースト用メッセージ |

### `app/src/components/layout/`

| ファイル | 説明 |
|----------|------|
| `Header.tsx` | オーバーレイ上部バー（タイトル・設定ボタン・元ポータルとの同期など） |
| `Footer.tsx` | フッター・FAB・カレンダー tooltip / コンテキストメニュー用 DOM のマウント |
| `PageShell.tsx` | 各ページ共通のタイトル行と本文ラッパ |
| `SettingsPanel.tsx` | 設定パネル UI（テーマ・各種トグル・ショートカット以外のオプション） |

### `app/src/components/pages/`

| ファイル | 説明 |
|----------|------|
| `HomePage.tsx` | ホーム：カレンダー群・お知らせ・キノ・ショートカットを配置 |
| `NewsPage.tsx` | お知らせ一覧：フィルタ・`reduceNewsListPortalMessage` による一覧状態 |
| `DetailPage.tsx` | お知らせ詳細 |
| `KyukoPage.tsx` | 休講・補講・教室変更 |
| `SurveyPage.tsx` | アンケート一覧 |

### `app/src/components/ui/`

| ファイル | 説明 |
|----------|------|
| `KinoPanel.tsx` | ポータルキノメッセージの表示パネル |
| `NewsList.tsx` | お知らせ行のリスト表示 |
| `LinkEditor.tsx` | ホームのショートカットリンク編集 UI |
| `Toast.tsx` | トースト通知とクリップボードコピー補助 |

### `app/src/context/`

| ファイル | 説明 |
|----------|------|
| `settings.tsx` | ユーザー設定の読み書き（`storage` 連携）と React Context |
| `courses.tsx` | King LMS から保存したコース一覧の Context |
| `portalDom.tsx` | `#portal-overlay` ルート要素と設定ポップオーバー用 ref の共有 |
| `calendarOverlayUi.tsx` | カレンダー tooltip・コンテキストメニュー・シラバス / King LMS ボタン用 ref の共有 |

### `app/src/features/calendar/`

| ファイル | 説明 |
|----------|------|
| `index.ts` | カレンダー機能の公開 API（コンポーネント・フック・型）の再エクスポート |
| `types.ts` | `CalParams` / `CalEvent` / `ViewMeta` などカレンダー共通型 |
| `anim.ts` | スワイプ・フェード・高さアニメ、`prefers-reduced-motion` 対応、`transitionend` 待機など |
| `assignment.ts` | King LMS 課題データ → カレンダー用 `CalEvent` への変換（`DuePayload` 等） |
| `grid.ts` | 週 / 月グリッドの HTML 文字列生成（`innerHTML` 注入用） |
| `kogi.ts` | 講義カレンダー用：tooltip 解析・シラバス URL・King LMS コース URL マッチング |
| `merge.ts` | 年跨ぎバルク取得などで得たイベント列のマージと重複除去 |
| `view-params.ts` | 週 / 月表示ラベルと API レスポンスからの表示パラメータ確定（純粋関数） |
| `use-panel.ts` | 汎用カレンダーパネルの状態・フェッチ・`postMessage` 連携の中心フック |
| `use-interactions.ts` | 講義コマの hover tooltip とコンテキストメニュー（委譲イベント） |
| `calendar-panel-process-inbound.ts` | `use-panel` から分離した受信処理（バルクフェッチ・週 / 月移動キューなど） |

### `app/src/features/calendar/components/`

| ファイル | 説明 |
|----------|------|
| `CalendarShell.tsx` | 週 / 月切替・前後ナビ・グリッド描画先をまとめたカレンダーシェル |
| `CalendarPanel.tsx` | 講義・補修・キャンパス等に使う汎用カレンダーパネル（`useCalendarPanel`） |
| `AssignmentCalendar.tsx` | 課題カレンダー専用パネル |

### `app/src/hooks/`

| ファイル | 説明 |
|----------|------|
| `usePortalMessage.ts` | `window` の `message` を購読し、コールバックへ渡す（クリーンアップ付き） |
| `useHomePortalInbox.ts` | ホーム用：`portal-messages-home` で postMessage を畳み込んだ受信箱状態 |
| `useHomeStorageBootstrap.ts` | ホーム初回マウントで `storage` からショートカット・課題・コースを読み込み |
| `useKogiNewsPrefetch.ts` | ホーム表示時に KogiNews API を先読み（MAIN フック側キャッシュ利用） |
| `useLastLogin.ts` | 素の HTML の `#lastLoginDt` から「前回ログイン」表示用テキストを一度だけ取得 |

### `app/src/lib/`

| ファイル | 説明 |
|----------|------|
| `api-paths.ts` | ポータル API パス定数と URL 判定（`api.ts` と `portal-hooks` で共有） |
| `api.ts` | 各 API の URL ビルダー・`pageFetch`（MAIN への postMessage 橋渡し）・`parseCalendarRequest` 等 |
| `storage.ts` | `chrome.storage` / `browser.storage` の薄いラッパ |
| `dom.ts` | HTML エスケープ・`setHtml`・`plainFromHtml`・お知らせ URL・メッセージ本文整形 |
| `date.ts` | ISO 日付・週範囲・月参照など DOM に依存しない日付ユーティリティ |
| `debug.ts` | 開発ビルド向けの `devLog` / `devWarn` |
| `portal-messages-home.ts` | ホーム向け postMessage を状態に畳み込む純粋関数と型ガード |
| `portal-messages-pages.ts` | お知らせ一覧 / 詳細・アンケート・休講ページ向けの reducer と共通 `pick` 等 |

### `app/src/shared/`

| ファイル | 説明 |
|----------|------|
| `constants.ts` | `MSG` 種別・`SK` ストレージキー・ページ ID・外部 URL 定数など |
| `types.ts` | フック橋渡し用の共有型（例: `PortalCapturedMessage`） |
| `news-list-filters.ts` | お知らせ一覧の絞り込み UI 用ラベル・カテゴリ値 |

### `app/src/themes/`

| ファイル | 説明 |
|----------|------|
| `theme-tokens.ts` | 1 テーマ分のカラー等の型（`ThemeTokens`） |
| `definitions.ts` | 既定テーマ名と `ThemeTokens` の対応（`THEMES` / `DEFAULT_THEME`） |
| `additional-themes.ts` | インディゴ・ストーンなど追加プリセットの `ThemeTokens` 定義 |
| `index.ts` | `getThemeCss`・トークン解決・オーバーレイへのテーマ CSS 適用ヘルパ |

### `app/src/styles/`

`portal.content` が `overlay.css?inline` で読み込む。**`overlay.css` が `@import` の入口**（読み込み順＝カスケード順）。

| ファイル | 説明 |
|----------|------|
| `overlay.css` | 他スタイルシートを `@import` するエントリのみ |
| `base.css` | `#portal-overlay` ルート、フォント・キーフレーム（フェード等）、低減モーション |
| `checkboxes.css` | チェックボックス・トグル風 UI |
| `layout.css` | ヘッダー・フッター・グリッド・FAB などレイアウト |
| `calendar.css` | カレンダーパネル・グリッド・講義コマ・tooltip 関連 |
| `panels.css` | 汎用パネル・ホームスタックなど |
| `settings.css` | 設定パネル専用 |
| `pages.css` | ニュース・詳細・休講・アンケート各ページ固有 |
| `utilities.css` | 小さなユーティリティクラス |
| `motion.css` | 入場フェードなどセクション単位のアニメーション指定 |

### `app/src/assets/`

| ファイル | 説明 |
|----------|------|
| `mascot.png` | 講義カレンダー「スリープ」表示用マスコット画像 |

---

## 動作のざっくりした流れ

1. **`portal-early`** が早い段階でテーマ用スタイルとブートカバーを置き、ちらつきを抑える。  
2. **`portal-hooks`** がポータル origin の MAIN world でネットワークをフックし、API 結果を隔離ワールドへ `postMessage`。  
3. **`portal`** が `#portal-overlay` に React をマウントし、ルートに応じたページを表示。  
4. King LMS では **`king-lms-hooks`** と **`king-lms-bridge`** が同様に連携し、コース・課題データをストレージへ保存してからポータルへ戻るフローを処理。

---

## コントリビューション

Issue・Pull Request を歓迎します。変更は既存の TypeScript / React のスタイルに合わせ、リリースに含める場合は `app/package.json` と `wxt.config.ts` の **version** を揃えて更新してください。

---

## ライセンス

[MIT License](LICENSE)
