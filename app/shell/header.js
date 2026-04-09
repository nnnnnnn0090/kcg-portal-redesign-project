/**
 * shell/header.js — ヘッダー HTML テンプレート + DOM 同期
 *
 * ロード順: document_idle（calendar/controller.js の後）。
 *
 * 役割:
 *   1. オーバーレイのヘッダー HTML を生成する（getHeaderHtml）
 *   2. ポータル元の navbar をパースしてオーバーレイのナビを更新する（syncNav）
 *   3. ポータル元のプロフィール名・リンクをオーバーレイに反映する（syncProfile）
 *   4. ポータル元の前回ログイン日時をオーバーレイに反映する（syncLastLogin）
 *
 * 公開: P.getHeaderHtml, P.syncNav, P.syncProfile, P.syncLastLogin
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  /**
   * P.THEMES のキー順でテーマ選択ボタン HTML を生成する（early/theme.js と同期）。
   * @returns {string}
   */
  function buildThemePickerButtons() {
    const T = P.THEMES;
    if (!T) return '';
    return Object.keys(T).map((key) => {
      const meta = T[key];
      const label = (meta && meta.name) ? meta.name : key;
      const active = key === 'dark' ? ' is-active' : '';
      return `<button type="button" class="p-theme-btn${active}" data-theme="${P.escAttr(key)}">${P.esc(label)}</button>`;
    }).join('\n              ');
  }

  // ────────────────────────────────────────────
  // ヘッダー HTML テンプレート
  //
  // ブランドロゴ・サイトナビ・設定パネル・プロフィール・ログアウトを含む。
  // ナビ・プロフィールは後から syncNav() / syncProfile() で中身を埋める。
  // ────────────────────────────────────────────

  function getHeaderHtml() {
    const themePickerButtons = buildThemePickerButtons();
    return `<header class="p-header"><div class="p-header-inner">
  <a class="p-brand" href="/portal/">
    <img src="/portal/favicon.ico" width="28" height="28" alt="">
    <span>ポータル</span>
  </a>

  <!-- ナビゲーション: syncNav() で中身を埋める -->
  <nav class="p-site-nav" id="p-site-nav" aria-label="ポータルメニュー" hidden></nav>

  <div class="p-header-actions">

    <!-- 設定ボタンとドロップダウン -->
    <div class="p-settings-wrap" id="p-settings-wrap">
      <button type="button" class="p-settings-open" id="p-open-settings"
              aria-expanded="false" aria-haspopup="dialog" aria-controls="p-settings-dialog">設定</button>
      <div class="p-settings-pop" id="p-settings-pop" hidden aria-hidden="true">
        <div class="p-settings-dialog" id="p-settings-dialog"
             role="dialog" aria-modal="false" aria-labelledby="p-settings-heading" tabindex="-1">
          <h2 id="p-settings-heading">設定</h2>

          <!-- テーマ選択 -->
          <div class="p-settings-section">
            <div class="p-settings-section-title">カラーテーマ</div>
            <div class="p-theme-picker" id="p-theme-picker">
              ${themePickerButtons}
            </div>
          </div>

          <!-- 表示設定 -->
          <div class="p-settings-section">
            <div class="p-settings-section-title">表示設定</div>
            <label class="p-settings-row">
              <input type="checkbox" id="p-settings-kino-empty-force" />
              <span>お知らせを、内容がなくても表示する</span>
            </label>
            <label class="p-settings-row">
              <input type="checkbox" id="p-settings-hoshu-cal-force" />
              <span>補修カレンダーを、予定がなくても表示する</span>
            </label>
            <label class="p-settings-row">
              <input type="checkbox" id="p-settings-campus-cal-force" />
              <span>キャンパスカレンダーを、予定がなくても表示する</span>
            </label>
            <label class="p-settings-row">
              <input type="checkbox" id="p-settings-hide-profile-name" />
              <span>ヘッダーに名前を表示しない</span>
            </label>
            <label class="p-settings-row">
              <input type="checkbox" id="p-settings-cal-link-king-lms" />
              <span>授業カレンダーの講義をクリックで King LMS のコース画面に移動する（オンにするとコース一覧へ移動し、保存が終わるとポータルに戻ります）</span>
            </label>
            <div class="p-settings-row p-settings-row-actions" id="p-settings-king-lms-resync-wrap" hidden>
              <button type="button" class="p-settings-resync-btn" id="p-settings-king-lms-resync">コース一覧を再取得</button>
            </div>
          </div>

          <p class="p-settings-version" id="p-settings-version" hidden></p>
        </div>
      </div>
    </div>

    <!-- プロフィールリンク: syncProfile() で中身を埋める -->
    <span class="p-profile-wrap" id="p-profile-wrap" hidden>
      <a class="p-profile-link" id="p-profile-link" href="/portal/Profile" title="プロフィール"></a>
    </span>

    <!-- ログアウトボタン -->
    <button type="button" class="p-logout" id="p-logout">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      ログアウト
    </button>

  </div>
</div></header>`;
  }

  // ────────────────────────────────────────────
  // ナビゲーション同期
  // ────────────────────────────────────────────

  /**
   * 相対 href を絶対 URL に変換する。
   * @param {string} href
   * @returns {string}
   */
  function resolveHref(href) {
    try { return new URL(href, location.origin).href; } catch (e) { return href; }
  }

  /**
   * ナビアイテム 1 件分の <a> タグ HTML を生成する。
   * @param {{ label: string, href: string, target?: string, title?: string }} item
   * @returns {string}
   */
  function navLinkHtml(item) {
    const href  = resolveHref(item.href);
    const title = item.title ? ` title="${P.escAttr(item.title)}"` : '';
    const tgt   = item.target && item.target !== '_self' ? item.target : '';
    const rel   = tgt === '_blank' ? ' rel="noopener noreferrer"' : '';
    const tAttr = tgt ? ` target="${P.escAttr(tgt)}"` : '';
    return `<a class="p-nav-btn" href="${P.escAttr(href)}"${tAttr}${title}${rel}>${P.esc(item.label)}</a>`;
  }

  /**
   * ポータル元の <ul.nav.navbar-nav> をパースしてナビアイテム配列を返す。
   * ドロップダウン（グループ）は { type:'group' }、単体リンクは { type:'link' }。
   * サブアイテムが 1 つだけのドロップダウンはフラットなリンクとして扱う。
   *
   * @param {HTMLElement} ul
   * @returns {Array}
   */
  function parseNavItems(ul) {
    const out = [];
    for (const li of ul.children) {
      if (!(li instanceof HTMLElement)) continue;
      if (li.classList.contains('logoff')) continue; // ログアウトは独自ボタンで対応

      if (li.classList.contains('dropdown')) {
        const toggle = li.querySelector(':scope > a.dropdown-toggle');
        const menu   = li.querySelector(':scope > ul.dropdown-menu');
        if (!toggle || !menu) continue;

        // caret アイコンを除いたラベルテキストを取得する
        const clone = toggle.cloneNode(true);
        clone.querySelectorAll('.caret').forEach((c) => c.remove());
        const groupLabel = clone.textContent.replace(/\s+/g, ' ').trim();

        // サブリンクを収集する（# や javascript: は除外）
        const subs = [...menu.querySelectorAll('a[href]')].reduce((acc, a) => {
          const h = a.getAttribute('href');
          if (!h || h === '#' || h.startsWith('javascript:')) return acc;
          acc.push({
            label:  a.textContent.replace(/\s+/g, ' ').trim(),
            href:   h,
            target: a.getAttribute('target') || '',
            title:  a.getAttribute('title')  || '',
          });
          return acc;
        }, []);

        if (subs.length === 0) continue;
        // サブが 1 つだけならフラットなリンクに
        out.push(subs.length === 1
          ? { type: 'link', ...subs[0] }
          : { type: 'group', label: groupLabel, items: subs });
      } else {
        const a = li.querySelector(':scope > a[href]');
        if (!a) continue;
        const h = a.getAttribute('href');
        if (!h || h === '#' || h.startsWith('javascript:')) continue;
        out.push({
          type:   'link',
          label:  a.textContent.replace(/\s+/g, ' ').trim(),
          href:   h,
          target: a.getAttribute('target') || '',
          title:  a.getAttribute('title')  || '',
        });
      }
    }
    return out;
  }

  /**
   * ポータル元の navbar をスキャンしてオーバーレイのナビを更新する。
   *
   * @param {Element | null} navEl - オーバーレイ内の <nav> 要素
   */
  function syncNav(navEl) {
    if (!navEl) return;

    const srcUl = [...document.querySelectorAll('ul.nav.navbar-nav')]
      .find((el) => !el.closest('#portal-overlay'));

    if (!srcUl) { navEl.replaceChildren(); navEl.hidden = true; return; }

    const items = parseNavItems(srcUl);
    if (items.length === 0) { navEl.replaceChildren(); navEl.hidden = true; return; }

    navEl.hidden = false;
    P.setHtml(navEl, items.map((item) => {
      if (item.type === 'link') return navLinkHtml(item);
      // グループは <details>/<summary> でドロップダウンを実装する
      const inner = item.items.map(navLinkHtml).join('');
      return `<details class="p-nav-dd">`
        + `<summary class="p-nav-btn p-nav-dd-sum">${P.esc(item.label)}</summary>`
        + `<div class="p-nav-dd-panel">${inner}</div>`
        + `</details>`;
    }).join(''));
  }

  // ────────────────────────────────────────────
  // プロフィール同期
  // ────────────────────────────────────────────

  /**
   * ポータル元のプロフィール名・リンクをオーバーレイに反映する。
   *
   * @param {{ wrapEl: Element | null, linkEl: HTMLAnchorElement | null }} els
   * @param {boolean} hideProfileName - 設定で非表示が選ばれているか
   */
  function syncProfile(els, hideProfileName) {
    const { wrapEl, linkEl } = els;
    if (!wrapEl || !linkEl) return;

    if (hideProfileName) { wrapEl.hidden = true; return; }

    const src  = [...document.querySelectorAll('span.profile a[href]')]
      .find((a) => !a.closest('#portal-overlay'));
    const name = src?.textContent?.trim() || '';

    if (!name) { wrapEl.hidden = true; return; }

    linkEl.textContent = name;
    try {
      linkEl.href = new URL(src.getAttribute('href') || '/portal/Profile', location.origin).href;
    } catch (e) {
      linkEl.href = '/portal/Profile';
    }
    linkEl.title = src.getAttribute('title') || 'プロフィール';
    wrapEl.hidden = false;
  }

  // ────────────────────────────────────────────
  // 前回ログイン日時の同期
  // ────────────────────────────────────────────

  /**
   * ポータル元の #lastLoginDt 要素のテキストをオーバーレイに反映する。
   *
   * @param {Element | null} el - オーバーレイ内の前回ログイン表示要素
   */
  function syncLastLogin(el) {
    if (!el) return;
    const src = document.getElementById('lastLoginDt');
    const raw = src ? src.textContent.replace(/\s+/g, ' ').trim() : '';
    if (!raw) { el.hidden = true; el.textContent = ''; return; }
    el.textContent = `前回ログイン ${raw}`;
    el.hidden = false;
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  Object.assign(P, { getHeaderHtml, syncNav, syncProfile, syncLastLogin });

})(typeof globalThis !== 'undefined' ? globalThis : window);
