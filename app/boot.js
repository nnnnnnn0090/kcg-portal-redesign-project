/**
 * boot.js — オーバーレイの統括オーケストレーター
 *
 * ロード順: document_idle（全ページファイルの後、main.js の前）。
 *
 * 責務:
 *   1. オーバーレイ DOM を構築して document.body に挿入する
 *   2. テーマ・設定パネル・ツールチップ・コンテキストメニューを初期化する
 *   3. 保存済み設定を読み込んで UI に反映する
 *   4. カレンダーコントローラーを初期化する（ホームページのみ）
 *   5. ページ固有の setup() を呼び出してメッセージハンドラーを取得する
 *   6. postMessage の配送テーブルを構築し、hook からのメッセージを捌く
 *
 * 各ページ固有ロジックは pages/*.setup() に委譲し、
 * ここでは「全ページ共通の処理」と「メッセージ配送テーブル」のみを持つ。
 *
 * 公開: P.boot(pageType, detailId), P.PAGE
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // ────────────────────────────────────────────
  // シェル DOM 同期ヘルパー
  // ────────────────────────────────────────────

  /**
   * ヘッダー（ナビ・プロフィール・前回ログイン）をポータル元の DOM から同期する。
   *
   * @param {boolean} hideProfileName
   */
  function syncChrome(hideProfileName) {
    P.syncProfile(
      {
        wrapEl: document.getElementById('p-profile-wrap'),
        linkEl: document.getElementById('p-profile-link'),
      },
      hideProfileName,
    );
    P.syncNav(document.getElementById('p-site-nav'));
    P.syncLastLogin(document.getElementById('p-last-login'));
  }

  /**
   * フッターをポータル元の DOM からコピーする。
   * フッターは変化しないため初回のみ呼べば十分。
   */
  function syncFooterOnce() {
    P.syncFooter({
      footerEl: document.getElementById('p-site-footer'),
      mountEl:  document.getElementById('p-footer-mount'),
    });
  }

  // ────────────────────────────────────────────
  // キノメッセージ描画ヘルパー
  // ────────────────────────────────────────────

  /**
   * キノパネルを描画するヘルパーを生成する。
   * 受け取ったデータを保持し、設定変更時に即座に再描画できるようにする。
   *
   * @param {{ kinoEmptyForce: () => boolean }} opts
   * @returns {{ apply: (data: object | null) => void, replay: () => void }}
   */
  function createKinoRenderer(opts) {
    let lastData = null;

    function apply(data) {
      lastData = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
      P.renderKino(
        {
          panelEl: document.getElementById('p-kino-panel'),
          titleEl: document.getElementById('p-kino-title'),
          bodyEl:  document.getElementById('p-kino-body'),
        },
        lastData,
        opts.kinoEmptyForce(),
      );
    }

    // 設定変更時: 最後に受け取ったデータで再描画する
    function replay() { apply(lastData); }

    return { apply, replay };
  }

  // ────────────────────────────────────────────
  // 拡張機能バージョン表示
  // ────────────────────────────────────────────

  /**
   * 設定パネル内のバージョン表示要素に現在のバージョンを設定する。
   */
  function syncExtensionVersionLabel() {
    const el = document.getElementById('p-settings-version');
    if (!el) return;
    let v = '';
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
        v = String(chrome.runtime.getManifest().version || '');
      } else if (typeof browser !== 'undefined' && browser.runtime?.getManifest) {
        v = String(browser.runtime.getManifest().version || '');
      }
    } catch (e) { /* 拡張機能コンテキスト外では無視 */ }
    if (v) {
      el.textContent = 'v' + v;
      el.hidden = false;
    }
  }

  // ────────────────────────────────────────────
  // メイン起動関数
  // ────────────────────────────────────────────

  /**
   * オーバーレイを起動する。
   * main.js から URL マッチ後に呼び出される。
   *
   * @param {string} pageType - P.PAGE.* のページタイプ定数
   * @param {string} [detailId] - お知らせ詳細ページの場合の ID 文字列
   */
  P.boot = function (pageType, detailId = '') {
    // ページタイプを真偽値フラグに展開する（各条件分岐を簡潔にするため）
    const isHome   = pageType === P.PAGE.HOME;
    const isNews   = pageType === P.PAGE.NEWS;
    const isDetail = pageType === P.PAGE.DETAIL;
    const isKyuko  = pageType === P.PAGE.KYUKO;
    const isSurvey = pageType === P.PAGE.SURVEY;

    // ── オーバーレイの <style> 要素を作成する
    // baseStyle: 不変の CSS、themeStyle: テーマ変数（動的に書き換える）
    const baseStyle   = document.createElement('style');
    baseStyle.textContent = P.getOverlayCssText();
    const themeStyle  = document.createElement('style');
    themeStyle.id     = 'portal-theme-vars';

    // ── オーバーレイのルート div を作成してページ HTML を埋め込む
    const root = document.createElement('div');
    root.id    = 'portal-overlay';

    const pageHtml = isDetail ? P.pages.detail.getHtml()
      : isNews     ? P.pages.news.getHtml()
      : isKyuko    ? P.pages.kyuko.getHtml()
      : isSurvey   ? P.pages.survey.getHtml()
      : /* home */   P.pages.home.getHtml();

    // ヘッダー + ページ本文 + フッターを一度に流し込む
    P.setHtml(root, P.getHeaderHtml() + pageHtml + P.getFooterHtml());

    // ── 設定状態オブジェクト（初期値）
    const settings = {
      kinoEmptyForce:  false,
      hoshuCalForce:   false,
      campusCalForce:  false,
      hideProfileName: false,
      calLinkKingLms:  false,
      theme:           'dark',
    };

    // ── テーママネージャー
    const themeManager = P.createThemeManager(themeStyle);

    /**
     * ストレージスナップショットからテーマ名を取得する。
     * 不明な名前は 'dark' にフォールバックする。
     *
     * @param {object} snap
     * @returns {string}
     */
    function themeNameFromSnapshot(snap) {
      const n = snap[P.SK.theme];
      return (n && P.THEMES[n]) ? n : 'dark';
    }

    // ── キノレンダラー
    const kino = createKinoRenderer({ kinoEmptyForce: () => settings.kinoEmptyForce });

    // ── カレンダーコントローラー（ホームのみ使用）
    let kogiCal        = null;
    let assignmentCal  = null;
    let hoshuCal       = null;
    let campusCal      = null;

    // ── ショートカットエディタ（ホームのみ）
    let linkEditor = null;

    // ── ページ固有ハンドラー（setup() の返り値を格納する）
    let newsHandlers   = null;
    let detailHandlers = null;
    let kyukoHandlers  = null;
    let surveyHandlers = null;

    // ────────────────────────────────────────────
    // 実際の初期化処理（document.body が準備できてから実行）
    // ────────────────────────────────────────────

    async function boot() {
      if (!document.body) {
        requestAnimationFrame(() => void boot());
        return;
      }

      // テーマを最初に適用してチラつきを防ぐ
      themeManager.apply(themeNameFromSnapshot(await P.storage.get([P.SK.theme])));

      // <head> を最小構成に入れ替える（ポータル元の CSS を排除）
      const titleClone = document.querySelector('title')?.cloneNode(true) ?? null;
      document.head.replaceChildren();
      document.head.appendChild(baseStyle);
      document.head.appendChild(themeStyle);
      if (titleClone) document.head.appendChild(titleClone);

      // オーバーレイを body に挿入してフラッシュ防止カバーを除去する
      document.body.appendChild(root);
      document.getElementById('kcg-portal-boot-cover')?.remove();

      // 背面のポータル本体がスクロールしないようにする
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow            = 'hidden';

      // 拡張機能バージョンを設定パネルに表示する
      syncExtensionVersionLabel();

      // ── ツールチップとコンテキストメニューの初期化
      const tooltip = P.createCalendarTooltip(root);
      let kogiCtxMenu = null;

      // ── ログアウトボタン: ポータル元の隠しフォームのリンクをクリックする
      document.getElementById('p-logout')?.addEventListener('click', () => {
        document.querySelector('#logoutForm a[href]')?.click();
      });

      // ── フッター内の #top リンクをオーバーレイ内スクロールに差し替える
      document.getElementById('p-site-footer')?.addEventListener('click', (e) => {
        const a   = e.target.closest('a[href]');
        const raw = a ? (a.getAttribute('href') || '').trim() : '';
        if (raw === '#top' || raw === '#Top') {
          e.preventDefault();
          root.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });

      // ── ページ先頭へボタン
      document.getElementById('p-scroll-top')?.addEventListener('click', () => {
        root.scrollTo({ top: 0, behavior: 'smooth' });
      });

      // ── 拡張機能紹介 URL のコピーボタン（toast.js に委譲）
      P.toast.wireShareButton(
        document.getElementById('p-share-extension'),
        P.EXTENSION_PROMO_PAGE_URL || '',
      );

      // ── King LMS 同期から戻った直後（URL ハッシュで通知）
      (function consumeSyncReturnHash() {
        const hash = location.hash.replace(/^#/, '');
        let toastMsg = '';
        if (hash === P.KING_LMS_SYNC_DONE_HASH) toastMsg = 'コース一覧を保存しました';
        else if (hash === P.KING_LMS_ASSIGNMENT_SYNC_DONE_HASH) toastMsg = '課題を取得しました';
        else if (hash === P.KING_LMS_ASSIGNMENT_SYNC_TIMEOUT_HASH) {
          toastMsg = '課題の取得が時間内に完了しませんでした';
        } else if (hash === P.KING_LMS_ASSIGNMENT_SYNC_ERROR_HASH) {
          toastMsg = '課題データを読み取れませんでした（King LMS の変更の可能性があります）';
        } else if (hash === P.KING_LMS_SYNC_TIMEOUT_HASH) {
          toastMsg = 'コース一覧の取得が時間内に完了しませんでした';
        }
        if (!toastMsg) return;
        try {
          history.replaceState(null, '', `${location.pathname}${location.search}`);
        } catch (e) {
          try { location.hash = ''; } catch (e2) {}
        }
        P.toast.show(toastMsg, { placement: 'top' });
      })();

      // ── 設定パネルの構築
      const settingsPanel = P.createSettingsPanel(themeManager, settings, {
        onKinoForceChange()      { kino.replay(); },
        onHoshuCalForceChange()  { hoshuCal?.applyEmptyVisibility(); },
        onCampusCalForceChange() { campusCal?.applyEmptyVisibility(); },
        onProfileChange() {
          P.syncProfile(
            {
              wrapEl: document.getElementById('p-profile-wrap'),
              linkEl: document.getElementById('p-profile-link'),
            },
            settings.hideProfileName,
          );
        },
        onCalLinkKingLmsChange() { kogiCal?.refreshCalLinks(); },
      });

      // 設定パネル外クリックで閉じる
      root.addEventListener('pointerdown', (e) => {
        if (!settingsPanel.isOpen()) return;
        const pop     = document.getElementById('p-settings-pop');
        const openBtn = document.getElementById('p-open-settings');
        if (!pop?.contains(e.target) && !openBtn?.contains(e.target)) {
          settingsPanel.close();
        }
      });

      // Escape キーの処理（設定 → コンテキストメニュー → ツールチップ の優先順位で閉じる）
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (settingsPanel.isOpen()) {
          settingsPanel.close();
        } else if (kogiCtxMenu?.isOpen()) {
          kogiCtxMenu.close();
        } else {
          tooltip.hide();
        }
      });

      // ── シェル（ナビ・プロフィール・前回ログイン）を初期同期する
      syncChrome(settings.hideProfileName);
      // フッターはポータル元が遅延描画するため、少し待ってから同期する
      window.setTimeout(syncFooterOnce, 0);
      window.setTimeout(() => {
        P.syncLastLogin(document.getElementById('p-last-login'));
        syncFooterOnce();
      }, 400);

      // ── カレンダーコントローラーの初期化（ホームページのみ）
      if (isHome) {
        kogiCtxMenu = P.createKogiContextMenu(root, () => tooltip.hide());

        kogiCal = P.createCalendarController({
          calUrl:           P.urls.kogiCalendar,
          calKind:          'kogi',
          getCalLinkKingLms: () => settings.calLinkKingLms,
          getKingLmsCourses: () => (Array.isArray(P.kingLmsCourses) ? P.kingLmsCourses : []),
          titles:           { week: '今週の授業', month: '今月の授業' },
          els: {
            panel:     document.querySelector('.p-panel-cal-kogi'),
            body:      document.getElementById('p-cal-body'),
            title:     document.getElementById('p-cal-title'),
            range:     document.getElementById('p-cal-range'),
            prev:      document.getElementById('p-cal-prev'),
            next:      document.getElementById('p-cal-next'),
            modeWeek:  document.getElementById('p-cal-mode-week'),
            modeMonth: document.getElementById('p-cal-mode-month'),
          },
        });

        assignmentCal = P.createAssignmentCalendarController({
          titles:        { week: '今週の課題', month: '今月の課題' },
          getDuePayload: () => P.kingLmsStreamsUltraDue,
          els: {
            panel:     document.querySelector('.p-panel-cal-assignment'),
            body:      document.getElementById('p-assignment-cal-body'),
            title:     document.getElementById('p-assignment-cal-title'),
            range:     document.getElementById('p-assignment-cal-range'),
            prev:      document.getElementById('p-assignment-cal-prev'),
            next:      document.getElementById('p-assignment-cal-next'),
            modeWeek:  document.getElementById('p-assignment-cal-mode-week'),
            modeMonth: document.getElementById('p-assignment-cal-mode-month'),
            toolbar:   document.getElementById('p-assignment-cal-toolbar'),
            calScroll: document.getElementById('p-assignment-cal-scroll'),
            fetchWrap: document.getElementById('p-assignment-fetch-wrap'),
            cacheNote: document.getElementById('p-assignment-cache-note'),
          },
        });

        // 課題「最新の状態に更新」: King LMS stream へリダイレクトして戻る
        document.getElementById('p-assignment-refresh-btn')?.addEventListener('click', () => {
          P.storage.set({
            [P.SK.kingLmsAssignmentSyncPending]:   true,
            [P.SK.kingLmsAssignmentSyncReturnUrl]: location.href,
          }).then(() => {
            location.href = P.KING_LMS_ASSIGNMENT_SYNC_URL;
          });
        });

        hoshuCal = P.createCalendarController({
          calUrl:          P.urls.hoshuCalendar,
          hideWhenEmpty:   true,
          getForceVisible: () => settings.hoshuCalForce,
          titles:          { week: '今週の補修', month: '今月の補修' },
          els: {
            panel:     document.querySelector('.p-panel-cal-hoshu'),
            body:      document.getElementById('p-hoshu-cal-body'),
            title:     document.getElementById('p-hoshu-cal-title'),
            range:     document.getElementById('p-hoshu-cal-range'),
            prev:      document.getElementById('p-hoshu-cal-prev'),
            next:      document.getElementById('p-hoshu-cal-next'),
            modeWeek:  document.getElementById('p-hoshu-cal-mode-week'),
            modeMonth: document.getElementById('p-hoshu-cal-mode-month'),
          },
        });

        campusCal = P.createCalendarController({
          calUrl:          P.urls.campusCalendar,
          hideWhenEmpty:   true,
          getForceVisible: () => settings.campusCalForce,
          titles:          { week: '今週のキャンパス', month: '今月のキャンパス' },
          els: {
            panel:     document.querySelector('.p-panel-cal-campus'),
            body:      document.getElementById('p-campus-cal-body'),
            title:     document.getElementById('p-campus-cal-title'),
            range:     document.getElementById('p-campus-cal-range'),
            prev:      document.getElementById('p-campus-cal-prev'),
            next:      document.getElementById('p-campus-cal-next'),
            modeWeek:  document.getElementById('p-campus-cal-mode-week'),
            modeMonth: document.getElementById('p-campus-cal-mode-month'),
          },
        });

        kogiCal.wireNav();
        assignmentCal.wireNav();
        assignmentCal.init();
        hoshuCal.wireNav();
        campusCal.wireNav();

        // ショートカットリンクエディタを初期化
        linkEditor = P.createLinkEditor(
          document.getElementById('p-links'),
          document.getElementById('p-link-edit-btn'),
          (cfg) => P.storage.set({ [P.SK.shortcutConfig]: cfg }),
        );

        // 授業に関するお知らせを取得する
        P.pageFetch(P.urls.kogiNews());
      }

      // ── ページ固有セットアップ（返り値はメッセージハンドラーオブジェクト）
      if (isNews)   newsHandlers   = P.pages.news.setup(root);
      if (isDetail) detailHandlers = P.pages.detail.setup(detailId);
      if (isKyuko)  kyukoHandlers  = P.pages.kyuko.setup(root);
      if (isSurvey) surveyHandlers = P.pages.survey.setup();

      // ── キノメッセージ（詳細ページを除く全ページ）
      if (!isDetail) {
        const kinoId = isNews   ? P.KINO_ID.news
          : isSurvey ? P.KINO_ID.survey
          : /* home */ P.KINO_ID.home;

        const kEls = {
          panelEl: document.getElementById('p-kino-panel'),
          titleEl: document.getElementById('p-kino-title'),
          bodyEl:  document.getElementById('p-kino-body'),
        };

        // 「読み込み中」プレースホルダーを表示してから API を叩く
        if (kEls.panelEl && kEls.titleEl && kEls.bodyEl) {
          kEls.panelEl.hidden = false;
          kEls.titleEl.textContent = '';
          P.setHtml(kEls.bodyEl, '<p class="p-empty">読み込み中…</p>');
          P.pageFetch(P.urls.kinoMessage(kinoId));
        }
      }

      // ── お知らせ詳細の初回フェッチ
      if (isDetail && detailId) {
        P.pageFetch(P.urls.deliveredDetail(detailId));
      }

      // ── 保存済み設定を読み込んで反映する（非同期）
      void (async () => {
        const stored     = await P.storage.get(Object.values(P.SK));
        const kingStored = stored[P.SK.kingLmsCourses];
        P.kingLmsCourses = Array.isArray(kingStored) ? kingStored : [];

        const dueRaw = stored[P.SK.kingLmsStreamsUltraDue];
        const dueOk =
          dueRaw != null &&
          typeof dueRaw === 'object' &&
          Array.isArray(dueRaw.items);
        P.kingLmsStreamsUltraDue = dueOk ? dueRaw : null;

        settings.kinoEmptyForce  = !!stored[P.SK.kinoEmptyForce];
        settings.hoshuCalForce   = !!stored[P.SK.hoshuCalForce];
        settings.campusCalForce  = !!stored[P.SK.campusCalForce];
        settings.hideProfileName = !!stored[P.SK.hideProfileName];
        settings.calLinkKingLms  = !!stored[P.SK.calLinkKingLms];

        // King LMS リンク設定をチェックボックスに反映する
        const cbCalKing = document.getElementById('p-settings-cal-link-king-lms');
        if (cbCalKing) cbCalKing.checked = settings.calLinkKingLms;
        settingsPanel.syncKingResyncVisibility();

        // テーマボタンのアクティブ状態を更新する
        const storedTheme = stored[P.SK.theme];
        settingsPanel.updateThemeButtons(
          storedTheme && P.THEMES[storedTheme] ? storedTheme : themeManager.getCurrent(),
        );

        // プロフィール表示設定を反映する
        P.syncProfile(
          {
            wrapEl: document.getElementById('p-profile-wrap'),
            linkEl: document.getElementById('p-profile-link'),
          },
          settings.hideProfileName,
        );

        // ホームでカレンダー設定を反映する（既に API レスポンスが来ている場合に備えて）
        if (isHome) {
          hoshuCal?.applyEmptyVisibility();
          campusCal?.applyEmptyVisibility();
          kogiCal?.refreshCalLinks();
          assignmentCal?.refreshFromStorage();
        }

        // ショートカット設定を読み込んで extras のみ先行表示する
        if (isHome && linkEditor) {
          const raw = stored[P.SK.shortcutConfig];
          const cfg = (raw && typeof raw === 'object') ? raw : {};
          linkEditor.render(undefined, P.HOME_SHORTCUT_EXTRAS, cfg);
        }

        // キノの強制表示設定を反映する
        kino.replay();
      })();

      // ────────────────────────────────────────────
      // メッセージ配送テーブル
      //
      // hooks/portal-fetch-hook.js がページコンテキストで傍受した API レスポンスを
      // window.postMessage で受け取り、対応するハンドラーに渡す。
      //
      // テーブル形式にすることで if-else の連鎖を排除し、
      // 新しいメッセージタイプの追加を 1 行で済むようにしている。
      // P.MSG 定数を使うことでタイポによるバグを防ぐ。
      // ────────────────────────────────────────────

      const messageHandlers = {
        // キノ（ポータルお知らせ）メッセージ: 全ページ共通
        [P.MSG.kinoMessage]:
          (d) => kino.apply(d.data),

        // 授業カレンダー: ホームのみ
        [P.MSG.kogiCalendar]:
          (d) => isHome && Array.isArray(d.items) && kogiCal?.processMessage(d),

        // 補修カレンダー: ホームのみ
        [P.MSG.hoshuCalendar]:
          (d) => isHome && Array.isArray(d.items) && hoshuCal?.processMessage(d),

        // キャンパスカレンダー: ホームのみ
        [P.MSG.campusCalendar]:
          (d) => isHome && Array.isArray(d.items) && campusCal?.processMessage(d),

        // 休講情報: 休講ページのみ
        [P.MSG.kyukoInfo]:
          (d) => isKyuko && Array.isArray(d.items) && kyukoHandlers?.onKyukoInfo(d),

        // 補講情報: 休講ページのみ
        [P.MSG.hokoInfo]:
          (d) => isKyuko && Array.isArray(d.items) && kyukoHandlers?.onHokoInfo(d),

        // 教室変更情報: 休講ページのみ
        [P.MSG.kyoshitsuChange]:
          (d) => isKyuko && Array.isArray(d.items) && kyukoHandlers?.onKyoshitsuChange(d),

        // アンケート一覧: アンケートページのみ
        [P.MSG.questionnaireInfo]:
          (d) => isSurvey && surveyHandlers?.onQuestionnaireInfo(d),

        // お知らせ詳細: 詳細ページのみ
        [P.MSG.deliveredNewsDetail]:
          (d) => isDetail && detailHandlers?.onDeliveredNewsDetail(d),

        // お知らせ年度別一覧: お知らせ一覧ページのみ
        [P.MSG.deliveredNews]:
          (d) => isNews && newsHandlers?.onDeliveredNews(d),

        // ホームのお知らせ一覧: ホームのみ
        [P.MSG.newTopics]:
          (d) => isHome && Array.isArray(d.items) &&
            P.renderNews(document.getElementById('p-news'), d.items),

        // 授業に関するお知らせ: ホームのみ
        [P.MSG.kogiNews]:
          (d) => isHome && Array.isArray(d.items) &&
            P.renderNews(document.getElementById('p-kogi-news'), d.items, {
              emptyMsg: '現在、新しいお知らせはありません。',
            }),

        // ショートカットリンク: ホームのみ（エディタ経由で描画）
        [P.MSG.userHtmlLink]:
          (d) => isHome && Array.isArray(d.items) && linkEditor &&
            linkEditor.render(d.items, P.HOME_SHORTCUT_EXTRAS),
      };

      window.addEventListener('message', (ev) => {
        if (ev.origin !== location.origin) return;
        if (!ev.data?.type) return;
        if (ev.data.type   === P.FETCH_HOOK.replayRequest) return;
        if (ev.data.source !== P.FETCH_HOOK.source) return;
        messageHandlers[ev.data.type]?.(ev.data);
      });

      // フック側がコンテンツスクリプト起動前に送信済みのメッセージを再送させる
      window.postMessage({ type: P.FETCH_HOOK.replayRequest }, '*');
    }

    void boot();
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
