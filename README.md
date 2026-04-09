# KCG Portal Redesign Project

京都コンピュータ学院（KCG）の学生向けポータル（`home.kcg.ac.jp`）向けの**非公式**ブラウザ拡張です。公式サイトの見た目と操作性を、読みやすいレイアウトに置き換えます。

## 免責事項

- 本拡張は**学校・運営元とは一切関係ありません**。有志によるオープンソースです。
- ポータル本体のサーバーや API を改変するものではなく、**ブラウザ上で表示を上書きする**仕組みです。
- 利用は自己責任でお願いします。不具合やアカウントへの影響について、作者は責任を負いません。

## 対応ブラウザ

Google Chrome、Microsoft Edge、Mozilla Firefox（Manifest V3 対応環境を想定）。

## 必要環境（開発・ビルド）

- **bash**、**Python 3**（ビルドスクリプトで `manifest.json` を加工）
- **zip**（macOS / Linux 標準）
- Firefox 向けパッケージを `web-ext` で作る場合: [web-ext](https://github.com/mozilla/web-ext)（未インストール時は zip のみ生成）

## 開発（未パッケージで読み込む）

1. リポジトリを取得する（例）。

   ```bash
   git clone https://github.com/<ユーザー名>/kcg-portal-redesign-project.git
   cd kcg-portal-redesign-project
   ```

2. 各ブラウザの「開発者向け / 一時的な拡張機能の読み込み」から、**リポジトリ内の `app` フォルダ**（`app/manifest.json` がある階層）を指定する。

`app/manifest.json` にはビルド用の `package_slug` が含まれる場合があります。ストア提出用と同じ中身で試す場合は、下記 `./build.sh` の成果物を展開して読み込んでも構いません。

## ビルド

リポジトリルートで:

```bash
./build.sh
```

- 一時ディレクトリに `app` をコピーし、`package_slug` を除いた `manifest.json` でパッケージ化します。
- 成果物は **`build/` 直下**に出力されます（ファイル名は `manifest.json` の `package_slug` と `version` に基づく）。
  - Chrome / Edge 用の `.zip`
  - Firefox 用の `.zip`（`web-ext` 利用時は Mozilla 向けビルド形式）

## リポジトリ構成（概要）

| パス | 説明 |
|------|------|
| `app/` | 拡張のソース（スクリプト・スタイル・`manifest.json`） |
| `build.sh` | 上記ビルドスクリプト |
| `build/` | ビルド生成物（`.gitignore` 対象） |

## コントリビューション

Issue・Pull Request を歓迎します。変更は既存のコードスタイルに合わせ、必要なら `app/manifest.json` の `version` を更新してください。

## ライセンス

[MIT License](LICENSE)（オープンソースとして自由に利用・改変・再配布できます。詳細は `LICENSE` を参照）。
