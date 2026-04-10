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

## リポジトリ構成（概要）

```
kcg-portal-redesign-project/
├── app/
│   ├── wxt.config.ts          # WXT / manifest 設定
│   ├── package.json
│   ├── src/
│   │   ├── entrypoints/       # コンテンツスクリプトのエントリ
│   │   │   ├── portal-early.content/   # document_start（早期テーマ・ブートカバー）
│   │   │   ├── portal-hooks.content/   # MAIN: fetch/XHR 傍受・postMessage
│   │   │   ├── portal.content/         # document_end: React マウント
│   │   │   ├── king-lms-hooks.content/
│   │   │   └── king-lms-bridge.content/  # King LMS 側ストレージブリッジ
│   │   ├── portal/            # React ルート・アプリ
│   │   ├── components/        # ページ・レイアウト・UI
│   │   ├── features/calendar/ # カレンダー機能
│   │   ├── hooks/             # React フック
│   │   ├── lib/               # API・DOM・メッセージ処理など
│   │   ├── themes/            # テーマ CSS 変数
│   │   └── styles/            # グローバル CSS
│   ├── e2e/                   # Playwright
│   └── .output/               # ビルド出力（gitignore 想定）
├── build.sh                   # ZIP を build/ に集約
├── build/                     # build.sh の出力先
├── LICENSE
└── README.md
```

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
