/**
 * ui/settings-panel.js — 設定パネル UI
 *
 * ロード順: document_idle（ui/theme-manager.js の後）。
 *
 * 「設定」ボタンのトグル開閉・テーマ選択・各チェックボックスの配線を担当する。
 * 設定値の永続化は storage.set() で行い、変更時のコールバックで
 * 呼び出し元（boot.js）に通知する。
 *
 * 【アニメーション設計】
 * 開く: hidden を外して即座に表示（CSS で opacity transition が走る）
 * 閉じる: is-closing クラスを追加 → transitionend 待機 → hidden に設定
 * フォールバックタイマーで transitionend が来なくても必ず閉じる。
 *
 * 公開: P.createSettingsPanel(themeManager, settings, callbacks)
 *        → { open, close, isOpen, updateThemeButtons, syncKingResyncVisibility }
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  /**
   * 設定パネルを構築してイベントを配線する。
   *
   * @param {{ apply: (n:string)=>void, getCurrent: ()=>string }} themeManager
   * @param {SettingsState} settings - boot.js が管理する設定状態オブジェクト（参照渡し）
   * @param {SettingsCallbacks} callbacks - 各設定変更時に呼ぶコールバック集
   * @returns {SettingsPanelHandle}
   */
  function createSettingsPanel(themeManager, settings, callbacks) {

    // ────────────────────────────────────────────
    // DOM 要素の取得
    // ────────────────────────────────────────────

    const popEl      = document.getElementById('p-settings-pop');
    const dialogEl   = document.getElementById('p-settings-dialog');
    const openBtn    = document.getElementById('p-open-settings');
    const pickerEl   = document.getElementById('p-theme-picker');
    const cbKino     = document.getElementById('p-settings-kino-empty-force');
    const cbHoshu    = document.getElementById('p-settings-hoshu-cal-force');
    const cbCampus   = document.getElementById('p-settings-campus-cal-force');
    const cbProfile  = document.getElementById('p-settings-hide-profile-name');
    const cbCalKing  = document.getElementById('p-settings-cal-link-king-lms');
    const btnResync  = document.getElementById('p-settings-king-lms-resync');
    const resyncWrap = document.getElementById('p-settings-king-lms-resync-wrap');

    // 閉じアニメーション中のクリーンアップを保持する
    /** @type {{ cancel: () => void } | null} */
    let closingCleanup = null;

    // ────────────────────────────────────────────
    // アニメーション制御
    // ────────────────────────────────────────────

    /** 閉じアニメーションを完了してパネルを hidden にする */
    function finishClose() {
      if (closingCleanup) { closingCleanup.cancel(); closingCleanup = null; }
      if (!popEl) return;
      popEl.classList.remove('is-closing');
      popEl.hidden = true;
      popEl.setAttribute('aria-hidden', 'true');
      openBtn?.setAttribute('aria-expanded', 'false');
      openBtn?.focus();
    }

    // ────────────────────────────────────────────
    // 補助 UI 同期
    // ────────────────────────────────────────────

    /** テーマ選択ボタンのアクティブ状態を更新する */
    function updateThemeButtons(name) {
      pickerEl?.querySelectorAll('.p-theme-btn').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.theme === name);
      });
    }

    /** King LMS 再取得ボタン行の表示状態を settings から同期する */
    function syncKingResyncVisibility() {
      if (resyncWrap) resyncWrap.hidden = !settings.calLinkKingLms;
    }

    // ────────────────────────────────────────────
    // 開閉 API
    // ────────────────────────────────────────────

    /** 設定パネルを開く */
    function open() {
      if (!popEl || !dialogEl) return;

      // 閉じアニメーション中なら即中断
      if (closingCleanup) { closingCleanup.cancel(); closingCleanup = null; }

      // チェックボックスとテーマボタンを最新の settings 値に同期する
      updateThemeButtons(themeManager.getCurrent());
      if (cbKino)    cbKino.checked    = settings.kinoEmptyForce;
      if (cbHoshu)   cbHoshu.checked   = settings.hoshuCalForce;
      if (cbCampus)  cbCampus.checked  = settings.campusCalForce;
      if (cbProfile) cbProfile.checked = settings.hideProfileName;
      if (cbCalKing) cbCalKing.checked = settings.calLinkKingLms;
      syncKingResyncVisibility();

      popEl.classList.remove('is-closing');
      popEl.hidden = false;
      popEl.setAttribute('aria-hidden', 'false');
      openBtn?.setAttribute('aria-expanded', 'true');
      dialogEl.focus(); // アクセシビリティ: フォーカスをダイアログへ移す
    }

    /** 設定パネルを閉じる（閉じアニメーション後に hidden を設定する） */
    function close() {
      if (!popEl || popEl.hidden) return;
      // 二重クローズを防ぐ
      if (popEl.classList.contains('is-closing')) return;

      // reduced-motion の場合はアニメなしで即閉じ
      if (P.anim.prefersReducedMotion()) {
        finishClose();
        return;
      }

      popEl.classList.add('is-closing');

      // CSS transition 完了（または 300ms 後）に finishClose を呼ぶ
      closingCleanup = P.anim.waitForTransition(popEl, 'opacity', () => {
        closingCleanup = null;
        finishClose();
      }, 300);
    }

    /** @returns {boolean} パネルが開いているか */
    function isOpen() {
      return !!(popEl && !popEl.hidden);
    }

    // ────────────────────────────────────────────
    // ボタン・チェックボックスのイベント配線
    // ────────────────────────────────────────────

    openBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      isOpen() ? close() : open();
    });

    // テーマ選択ボタン（クリック委譲）
    pickerEl?.addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('.p-theme-btn') : null;
      if (!btn || !P.THEMES[btn.dataset.theme]) return;
      const name = btn.dataset.theme;
      themeManager.apply(name);
      updateThemeButtons(name);
      void P.storage.set({ [P.SK.theme]: name });
    });

    // チェックボックス: お知らせ強制表示
    cbKino?.addEventListener('change', () => {
      settings.kinoEmptyForce = !!cbKino.checked;
      void P.storage.set({ [P.SK.kinoEmptyForce]: settings.kinoEmptyForce });
      callbacks.onKinoForceChange?.();
    });

    // チェックボックス: 補修カレンダー強制表示
    cbHoshu?.addEventListener('change', () => {
      settings.hoshuCalForce = !!cbHoshu.checked;
      void P.storage.set({ [P.SK.hoshuCalForce]: settings.hoshuCalForce });
      callbacks.onHoshuCalForceChange?.();
    });

    // チェックボックス: キャンパスカレンダー強制表示
    cbCampus?.addEventListener('change', () => {
      settings.campusCalForce = !!cbCampus.checked;
      void P.storage.set({ [P.SK.campusCalForce]: settings.campusCalForce });
      callbacks.onCampusCalForceChange?.();
    });

    // チェックボックス: プロフィール名非表示
    cbProfile?.addEventListener('change', () => {
      settings.hideProfileName = !!cbProfile.checked;
      void P.storage.set({ [P.SK.hideProfileName]: settings.hideProfileName });
      callbacks.onProfileChange?.();
    });

    // チェックボックス: King LMS リンク
    // ON にすると King LMS コース画面へ遷移してコース一覧を取得・保存し、ポータルへ戻る
    cbCalKing?.addEventListener('change', () => {
      settings.calLinkKingLms = !!cbCalKing.checked;
      if (cbCalKing.checked) {
        void P.storage.set({
          [P.SK.calLinkKingLms]:       true,
          [P.SK.kingLmsSyncPending]:   true,
          [P.SK.kingLmsSyncReturnUrl]: location.href,
        }).then(() => {
          window.location.href = P.KING_LMS_COURSE_SYNC_URL;
        });
      } else {
        void P.storage.set({
          [P.SK.calLinkKingLms]:       false,
          [P.SK.kingLmsSyncPending]:   false,
          [P.SK.kingLmsSyncReturnUrl]: '',
        });
        callbacks.onCalLinkKingLmsChange?.();
        syncKingResyncVisibility();
      }
    });

    // King LMS コース一覧を再取得するボタン（チェック状態は変えず、同期フローだけ走らせる）
    btnResync?.addEventListener('click', (e) => {
      e.stopPropagation();
      void P.storage.set({
        [P.SK.kingLmsSyncPending]:   true,
        [P.SK.kingLmsSyncReturnUrl]: location.href,
      }).then(() => {
        window.location.href = P.KING_LMS_COURSE_SYNC_URL;
      });
    });

    // ────────────────────────────────────────────
    // 公開 API
    // ────────────────────────────────────────────

    return { open, close, isOpen, updateThemeButtons, syncKingResyncVisibility };
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  P.createSettingsPanel = createSettingsPanel;

})(typeof globalThis !== 'undefined' ? globalThis : window);
