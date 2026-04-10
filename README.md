# KCG Portal Redesign Project

京都コンピュータ学院（KCG）の学生向けポータル（`home.kcg.ac.jp`）向けの**非公式**ブラウザ拡張です。公式サイトの見た目と操作性を、読みやすいレイアウトに置き換えます。

> バージョン: `2.0.1` — Manifest V3 対応

---

## 免責事項

- 本拡張は**学校・運営元とは一切関係ありません**。有志によるオープンソースです。
- ポータル本体のサーバーや API を改変するものではなく、**ブラウザ上で表示を上書きする**仕組みです。
- 利用は自己責任でお願いします。不具合やアカウントへの影響について、作者は責任を負いません。

---

## 主な機能

### ページUI の再設計

| ページ | 概要 |
|--------|------|
| ホーム (`/portal`) | 情報を整理した見やすいトップページ |
| お知らせ一覧 (`/portal/News`) | 読みやすいニュースリスト |
| お知らせ詳細 (`/portal/News/Detail/:id`) | 記事の詳細表示 |
| 休講・補講・教室変更 (`/portal/KyukoHokoEtc`) | 変更情報をわかりやすく整理 |
| アンケート (`/portal/Questionnaire`) | アンケート画面を再デザイン |

### カレンダー

- **講義カレンダー** — 時間割をカレンダー形式で表示。コンテキストメニューで詳細確認
- **補講・休講カレンダー** — 補講・休講情報を日付ベースで表示
- **キャンパスカレンダー** — 学院行事の一覧
- **課題カレンダー** — King LMS の提出期限をカレンダーに統合表示

### King LMS 連携

- King LMS（`king-lms.kcg.edu`）のネットワーク通信を拡張機能のフックで傍受し、コース情報・課題情報を取得
- 取得データを `chrome.storage` 経由でポータル側のカレンダーに自動反映
- ポータル←→King LMS 間のシームレスな同期フロー

### テーマ・カスタマイズ

- **ライト / ダーク テーマ** の切り替え（起動時のちらつき防止処理付き）
- **ショートカットリンク** の編集・並び替えが可能
- **設定パネル** から各種オプションを変更できる
- 設定は `chrome.storage` に永続保存

### UX 向上

- トースト通知（同期完了・共有ボタン押下時など）
- カレンダーツールチップ（日程にカーソルを当てると詳細表示）
- コンテキストメニュー（講義コマを右クリックしてアクション実行）
- アニメーション付きの滑らかなUI遷移

---

## 対応ブラウザ

| ブラウザ | 対応状況 |
|----------|----------|
| Google Chrome | ✅ |
| Microsoft Edge | ✅ |
| Mozilla Firefox | ✅（Manifest V3 対応環境） |

---

## 必要環境（開発・ビルド）

- **bash**、**Python 3**（ビルドスクリプトで `manifest.json` を加工）
- **zip**（macOS / Linux 標準）
- Firefox 向けパッケージを `web-ext` で作る場合: [web-ext](https://github.com/mozilla/web-ext)（未インストール時は zip のみ生成）

---

## 開発（未パッケージで読み込む）

1. リポジトリを取得する。

   ```bash
   git clone https://github.com/<ユーザー名>/kcg-portal-redesign-project.git
   cd kcg-portal-redesign-project
   ```

2. 各ブラウザの「開発者向け / 一時的な拡張機能の読み込み」から、**リポジトリ内の `app` フォルダ**（`app/manifest.json` がある階層）を指定する。

`app/manifest.json` にはビルド用の `package_slug` が含まれる場合があります。ストア提出用と同じ中身で試す場合は、下記 `./build.sh` の成果物を展開して読み込んでも構いません。

---

## ビルド

リポジトリルートで:

```bash
./build.sh
```

- 一時ディレクトリに `app` をコピーし、`package_slug` を除いた `manifest.json` でパッケージ化します。
- 成果物は **`build/` 直下**に出力されます（ファイル名は `manifest.json` の `package_slug` と `version` に基づく）。
  - Chrome / Edge 用の `.zip`
  - Firefox 用の `.zip`（`web-ext` 利用時は Mozilla 向けビルド形式）

---

## リポジトリ構成

```
kcg-portal-redesign-project/
├── app/                        # 拡張のソース
│   ├── manifest.json           # 拡張メタデータ・パーミッション定義（MV3）
│   ├── main.js                 # URLルーター（パスを各ページにマッピング）
│   ├── boot.js                 # オーバーレイ起動・DOM構築・メッセージ管理
│   │
│   ├── api/
│   │   └── urls.js             # ポータルAPIのURL生成・認証済みfetchブリッジ
│   │
│   ├── bridges/
│   │   └── king-lms-bridge.js  # King LMSデータをストレージ経由でポータルに橋渡し
│   │
│   ├── calendar/
│   │   ├── controller.js       # カレンダー汎用コントローラ
│   │   ├── assignment-calendar.js  # King LMS課題カレンダー
│   │   ├── grid-builder.js     # カレンダーグリッドのレイアウト生成
│   │   └── kogi-helpers.js     # 講義カレンダー用ヘルパー・コンテキストメニュー
│   │
│   ├── core/
│   │   ├── constants.js        # 定数（ストレージキー・ページID・テーマ定義）
│   │   ├── date.js             # 日付ユーティリティ
│   │   ├── dom.js              # DOMヘルパー・オーバーレイCSS管理
│   │   └── storage.js          # chrome.storageラッパー
│   │
│   ├── early/                  # document_start 時点で最初に実行
│   │   ├── theme.js            # 起動時の早期テーマ適用（ちらつき防止）
│   │   └── boot-cover.js       # オーバーレイ読み込み完了までのカバー
│   │
│   ├── hooks/                  # MAIN world でfetch/XHRを傍受
│   │   ├── portal-fetch-hook.js    # ポータルのfetch/XHRをインターセプト
│   │   ├── portal-fetch-bridge.js  # pageFetch / リプレイ用ブリッジ
│   │   └── king-lms-fetch-hook.js  # King LMSのネットワーク通信を傍受
│   │
│   ├── pages/                  # 各ページのHTML生成とセットアップ
│   │   ├── home.js             # ホームページ
│   │   ├── news.js             # お知らせ一覧
│   │   ├── detail.js           # お知らせ詳細
│   │   ├── kyuko.js            # 休講・補講・教室変更
│   │   └── survey.js           # アンケート
│   │
│   ├── renderers/              # データからUIへのレンダリング
│   │   ├── news.js             # お知らせリストのレンダリング
│   │   ├── links.js            # ショートカットリンク・リンク編集
│   │   └── kino.js             # ポータルメッセージパネル
│   │
│   ├── shell/                  # 共通レイアウト
│   │   ├── header.js           # ヘッダーHTML・元ポータルからの情報同期
│   │   └── footer.js           # フッター同期
│   │
│   └── ui/                     # UIコンポーネント
│       ├── animation.js        # アニメーション
│       ├── toast.js            # トースト通知
│       ├── tooltip.js          # カレンダーツールチップ
│       ├── context-menu.js     # コンテキストメニュー
│       ├── theme-manager.js    # テーマ切り替え管理
│       └── settings-panel.js  # 設定パネルUI
│
├── build.sh                    # ビルドスクリプト
├── build/                      # ビルド生成物（.gitignore対象）
└── LICENSE                     # MIT License
```

---

## 動作の仕組み

1. **早期スクリプト（`early/`）** が `document_start` で実行され、テーマ適用とちらつき防止カバーを設置する。
2. **フックスクリプト（`hooks/`）** が MAIN world で `fetch` / XHR を上書きし、APIレスポンスを拡張機能側に `postMessage` で転送する。
3. **`main.js`** が現在のURLパスを判定し、対応するページモジュールを呼び出す。
4. **`boot.js`** がDOM・テーマ・設定・カレンダーを初期化し、`postMessage` のルーティングを担う。
5. **King LMS ブリッジ（`bridges/king-lms-bridge.js`）** が King LMS 側のデータを `chrome.storage` に書き込み、ポータル側のカレンダーと同期する。

---

## コントリビューション

Issue・Pull Request を歓迎します。変更は既存のコードスタイルに合わせ、必要なら `app/manifest.json` の `version` を更新してください。

---

## ライセンス

[MIT License](LICENSE)（オープンソースとして自由に利用・改変・再配布できます。詳細は `LICENSE` を参照）。
