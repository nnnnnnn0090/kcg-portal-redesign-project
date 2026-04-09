/**
 * pages/home.js — ホームページ
 *
 * ロード順: document_idle（renderers/kino.js の後）。
 *
 * ホームページの HTML テンプレートのみを定義する。
 * カレンダー・お知らせ・ショートカットのデータ描画は boot.js が担当する。
 *
 * 公開: P.pages.home.getHtml()
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});
  P.pages = P.pages || {};

  P.pages.home = {

    /**
     * ホームページの HTML 文字列を返す。
     * boot.js が P.setHtml() でオーバーレイルートに流し込む。
     *
     * @returns {string}
     */
    getHtml() {
      return `<main class="p-main">
  <div class="p-main-head">
    <h1>ホーム</h1>
    <!-- 前回ログイン日時: syncLastLogin() で埋める -->
    <p class="p-last-login" id="p-last-login" hidden></p>
  </div>
  <div class="p-stack">

    <!-- キノ（ポータルお知らせ）パネル: renderKino() が描画 -->
    <section class="p-panel p-panel-kino" id="p-kino-panel" hidden>
      <span class="p-panel-head" id="p-kino-title"></span>
      <div class="p-panel-body">
        <div class="p-kino-message" id="p-kino-body"></div>
      </div>
    </section>

    <!-- 授業カレンダー -->
    <section class="p-panel p-panel-cal p-panel-cal-kogi">
      <div class="p-cal-toolbar">
        <span class="p-cal-title" id="p-cal-title">今週の授業</span>
        <!-- 週/月 表示モード切替 -->
        <div class="p-cal-mode" role="group" aria-label="授業カレンダー表示切替">
          <button type="button" class="p-cal-mode-btn is-active" id="p-cal-mode-week"  data-mode="week">週</button>
          <button type="button" class="p-cal-mode-btn"           id="p-cal-mode-month" data-mode="month">月</button>
        </div>
        <!-- 前後ナビゲーション -->
        <div class="p-cal-nav">
          <button type="button" class="p-cal-btn" id="p-cal-prev" disabled>戻る</button>
          <span class="p-cal-range" id="p-cal-range"></span>
          <button type="button" class="p-cal-btn" id="p-cal-next" disabled>次へ</button>
        </div>
      </div>
      <div class="p-panel-body p-cal-scroll">
        <div id="p-cal-body" data-cal-loading data-cal-mode="week">
          <p class="p-empty p-cal-loading-msg">読み込み中…</p>
        </div>
      </div>
    </section>

    <!-- 課題カレンダー -->
    <section class="p-panel p-panel-cal p-panel-cal-assignment">
      <div class="p-assignment-head-row">
        <span class="p-panel-head">課題カレンダー</span>
        <button type="button" class="p-settings-resync-btn" id="p-assignment-refresh-btn">最新の状態に更新</button>
      </div>
      <div class="p-panel-body p-assignment-fetch-wrap" id="p-assignment-fetch-wrap">
        <p class="p-empty">保存された課題はまだありません。「最新の状態に更新」で King LMS から取り込めます。</p>
      </div>
      <p class="p-assignment-cache-note" id="p-assignment-cache-note" hidden role="note">
        表示は King LMS から取得した内容の保存データです。最新の状態でない可能性があります。「最新の状態に更新」で更新できます。
      </p>
      <!-- データあり時: カレンダー -->
      <div class="p-cal-toolbar" id="p-assignment-cal-toolbar" hidden>
        <span class="p-cal-title" id="p-assignment-cal-title">今週の課題</span>
        <div class="p-cal-mode" role="group" aria-label="課題カレンダー表示切替">
          <button type="button" class="p-cal-mode-btn is-active" id="p-assignment-cal-mode-week"  data-mode="week">週</button>
          <button type="button" class="p-cal-mode-btn"           id="p-assignment-cal-mode-month" data-mode="month">月</button>
        </div>
        <div class="p-cal-nav">
          <button type="button" class="p-cal-btn" id="p-assignment-cal-prev">戻る</button>
          <span class="p-cal-range" id="p-assignment-cal-range"></span>
          <button type="button" class="p-cal-btn" id="p-assignment-cal-next">次へ</button>
        </div>
      </div>
      <div class="p-panel-body p-cal-scroll" id="p-assignment-cal-scroll" hidden>
        <div id="p-assignment-cal-body" data-cal-loading data-cal-mode="week">
          <p class="p-empty p-cal-loading-msg">読み込み中…</p>
        </div>
      </div>
    </section>

    <!-- 補修カレンダー: 予定がない場合は設定に応じて hidden -->
    <section class="p-panel p-panel-cal p-panel-cal-hoshu" hidden>
      <div class="p-cal-toolbar">
        <span class="p-cal-title" id="p-hoshu-cal-title">今週の補修</span>
        <div class="p-cal-mode" role="group" aria-label="補修カレンダー表示切替">
          <button type="button" class="p-cal-mode-btn is-active" id="p-hoshu-cal-mode-week"  data-mode="week">週</button>
          <button type="button" class="p-cal-mode-btn"           id="p-hoshu-cal-mode-month" data-mode="month">月</button>
        </div>
        <div class="p-cal-nav">
          <button type="button" class="p-cal-btn" id="p-hoshu-cal-prev" disabled>戻る</button>
          <span class="p-cal-range" id="p-hoshu-cal-range"></span>
          <button type="button" class="p-cal-btn" id="p-hoshu-cal-next" disabled>次へ</button>
        </div>
      </div>
      <div class="p-panel-body p-cal-scroll">
        <div id="p-hoshu-cal-body" data-cal-loading data-cal-mode="week">
          <p class="p-empty p-cal-loading-msg">読み込み中…</p>
        </div>
      </div>
    </section>

    <!-- キャンパスカレンダー: 予定がない場合は設定に応じて hidden -->
    <section class="p-panel p-panel-cal p-panel-cal-campus" hidden>
      <div class="p-cal-toolbar">
        <span class="p-cal-title" id="p-campus-cal-title">今週のキャンパス</span>
        <div class="p-cal-mode" role="group" aria-label="キャンパスカレンダー表示切替">
          <button type="button" class="p-cal-mode-btn is-active" id="p-campus-cal-mode-week"  data-mode="week">週</button>
          <button type="button" class="p-cal-mode-btn"           id="p-campus-cal-mode-month" data-mode="month">月</button>
        </div>
        <div class="p-cal-nav">
          <button type="button" class="p-cal-btn" id="p-campus-cal-prev" disabled>戻る</button>
          <span class="p-cal-range" id="p-campus-cal-range"></span>
          <button type="button" class="p-cal-btn" id="p-campus-cal-next" disabled>次へ</button>
        </div>
      </div>
      <div class="p-panel-body p-cal-scroll">
        <div id="p-campus-cal-body" data-cal-loading data-cal-mode="week">
          <p class="p-empty p-cal-loading-msg">読み込み中…</p>
        </div>
      </div>
    </section>

    <!-- 授業に関するお知らせ -->
    <section class="p-panel">
      <span class="p-panel-head">授業に関するお知らせ</span>
      <div class="p-panel-body" id="p-kogi-news">
        <p class="p-empty">読み込み中…</p>
      </div>
    </section>

    <!-- お知らせ & ショートカット（2カラムグリッド） -->
    <div class="p-grid">
      <section class="p-panel">
        <span class="p-panel-head">お知らせ</span>
        <div class="p-panel-body" id="p-news">
          <p class="p-empty">読み込み中…</p>
        </div>
      </section>
      <section class="p-panel p-panel-links">
        <span class="p-panel-head">ショートカット<button type="button" class="p-link-edit-btn" id="p-link-edit-btn">編集</button></span>
        <div class="p-panel-body" id="p-links">
          <p class="p-empty">読み込み中…</p>
        </div>
      </section>
    </div>

  </div>
</main>`;
    },
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
