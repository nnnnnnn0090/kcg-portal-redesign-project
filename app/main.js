/**
 * main.js — URL ルーター
 *
 * ロード順: document_idle（boot.js の後、最後に実行される）。
 *
 * 現在の URL を判定して P.boot(pageType, id) を呼び出す。
 * マッチするルートがなければフラッシュ防止カバーを除去して終了する。
 *
 * ルートテーブルは上から順に評価し、最初にマッチしたエントリを使う。
 * 新しいページを追加する場合は ROUTES 配列にエントリを追加するだけでよい。
 */
(function (G) {
  'use strict';

  const P = G.P;

  /**
   * フラッシュ防止カバー要素を除去する。
   * boot.js が起動しなかった場合（対象外ページ）に呼び出す。
   */
  function removeBootCover() {
    try {
      document.getElementById('kcg-portal-boot-cover')?.remove();
    } catch (e) { /* DOM が壊れていても無視 */ }
  }

  // P.boot が存在しない場合（スクリプトの読み込みに失敗した場合など）は終了する
  if (!P?.boot) {
    removeBootCover();
    return;
  }

  // 対象ホスト以外では動作しない
  if (location.hostname !== 'home.kcg.ac.jp') {
    removeBootCover();
    return;
  }

  // 末尾スラッシュを除去して正規化する
  const path = location.pathname.replace(/\/+$/, '') || '/portal';

  // ────────────────────────────────────────────
  // ルートテーブル
  //
  // test()  : パスが該当するか判定する関数
  // page    : P.PAGE.* のページタイプ定数
  // id()    : 詳細ページのみ。URL からIDを取り出す関数（省略可）
  // ────────────────────────────────────────────

  /** @type {Array<{ test: () => boolean, page: string, id?: () => string }>} */
  const ROUTES = [
    // ホーム（/portal）
    {
      test: () => path === '/portal',
      page: P.PAGE.HOME,
    },

    // お知らせ一覧
    {
      test: () => path === '/portal/News',
      page: P.PAGE.NEWS,
    },

    // 休講・補講・教室変更
    {
      test: () => path === '/portal/KyukoHokoEtc',
      page: P.PAGE.KYUKO,
    },

    // 授業評価アンケート
    {
      test: () => path === '/portal/Questionnaire',
      page: P.PAGE.SURVEY,
    },

    // お知らせ詳細（/portal/News/Detail/:id）
    {
      test: () => /^\/portal\/News\/Detail\/([^/]+)$/.test(path),
      page: P.PAGE.DETAIL,
      id:   () => path.match(/^\/portal\/News\/Detail\/([^/]+)$/)?.[1] || '',
    },
  ];

  // マッチするルートを探す
  const match = ROUTES.find((r) => r.test());

  if (!match) {
    removeBootCover();
    return;
  }

  try {
    P.boot(match.page, match.id ? match.id() : '');
  } catch (e) {
    removeBootCover();
    throw e;
  }

})(typeof globalThis !== 'undefined' ? globalThis : window);
