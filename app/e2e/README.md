# E2E（実サーバー）

拡張 E2E は **本物の KCG ポータル** に対して実行します。fixture / host-router は使いません。

## 必須環境変数

| 変数 | 用途 |
|---|---|
| `PORTAL_MS_EMAIL` | Microsoft SSO（KCG ポータル） |
| `PORTAL_MS_PASSWORD` | 同上 |

## コミュニティ flow 用（任意）

| 変数 | 用途 |
|---|---|
| `COMMUNITY_E2E_LOGIN_ID` | みんなの活動ログイン（FL-12） |
| `COMMUNITY_E2E_PASSWORD` | 同上 |
| `COMMUNITY_E2E_API_ORIGIN` | コミュニティ API（未設定時 `--with-e2e` は `http://127.0.0.1:8787`） |

`run-tests.sh --with-e2e` 実行時はコミュニティサーバーを自動起動し、`COMMUNITY_E2E_API_ORIGIN` を設定して flows の入口を有効化します。

## 実行

```bash
cd app
npm run build
export PORTAL_MS_EMAIL='...'
export PORTAL_MS_PASSWORD='...'
npm run test:e2e:flows
```

## 設計

- **1 ブラウザプロファイル共有**: ログインは worker 開始時に 1 回。
- **プロファイルは削除しない**: 2 回目以降の実行は SSO スキップ（`e2e/.auth/chrome-profile` を保持）。
- **タブ整理**: 各ステップは同一タブを再利用。
- **FL-01 のみ**: 初回インストール検証のため、別プロファイルで実行。

## 進捗表示

- Playwright: `line` + `list` reporter（ローカル）。
- Vitest: `verbose` reporter（ローカル）。各ユニットテスト名を実行中に表示。
- ログイン・サーバー起動も `[e2e HH:MM:SS]` プレフィックス付きで表示。
