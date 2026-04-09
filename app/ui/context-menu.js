/**
 * ui/context-menu.js — 授業カレンダー右クリックコンテキストメニュー
 *
 * ロード順: document_idle（ui/tooltip.js の後）。
 *
 * 授業カレンダーのイベントセル（.p-cal-ev[data-cal-kind="kogi"]）を
 * 右クリックすると「シラバスを開く」「King LMS を開く」の
 * コンテキストメニューを表示する。
 *
 * 公開: P.createKogiContextMenu(root, hideTooltip) → { close, isOpen }
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // ────────────────────────────────────────────
  // メニュー位置計算
  // ────────────────────────────────────────────

  /**
   * メニューをカーソル位置に画面内クランプして配置する。
   *
   * @param {Element} menuEl
   * @param {number} clientX
   * @param {number} clientY
   */
  function positionMenu(menuEl, clientX, clientY) {
    const w    = menuEl.offsetWidth;
    const h    = menuEl.offsetHeight;
    const pad  = 8;
    const left = Math.max(pad, Math.min(clientX, window.innerWidth  - w - pad));
    const top  = Math.max(pad, Math.min(clientY, window.innerHeight - h - pad));
    menuEl.style.left = `${left}px`;
    menuEl.style.top  = `${top}px`;
  }

  // ────────────────────────────────────────────
  // コンテキストメニュー工場関数
  // ────────────────────────────────────────────

  /**
   * 授業カレンダーの右クリックコンテキストメニューを配線する。
   *
   * @param {Element} root               - イベント委譲の起点（#portal-overlay）
   * @param {(() => void) | null} hideTooltip - ホバーツールチップを隠す関数
   * @returns {{ close: () => void, isOpen: () => boolean }}
   */
  function createKogiContextMenu(root, hideTooltip) {
    const menuEl  = document.getElementById('p-cal-ctx-menu');
    const btnSyl  = document.getElementById('p-cal-ctx-syllabus');
    const btnKing = document.getElementById('p-cal-ctx-kinglms');

    // 要素が揃わない場合はダミーオブジェクトを返す（ページによっては存在しない）
    if (!menuEl || !btnSyl || !btnKing) {
      return { close() {}, isOpen: () => false };
    }

    let urlSyllabus = '';
    let urlKingLms  = '';

    const close  = () => { menuEl.hidden = true; };
    const isOpen = () => !menuEl.hidden;

    // ────────────────────────────────────────────
    // 右クリック（contextmenu）
    // ────────────────────────────────────────────

    root.addEventListener('contextmenu', (e) => {
      const ev = e.target instanceof Element
        ? e.target.closest('.p-cal-ev[data-cal-kind="kogi"]')
        : null;
      if (!ev || !root.contains(ev)) return;

      e.preventDefault();
      e.stopPropagation();
      hideTooltip?.();

      const title    = ev.dataset.calTitle || '';
      const tipPlain = ev.dataset.calTip   || '';

      // シラバス URL はカレンダーデータから
      urlSyllabus = P.syllabusUrl('', tipPlain);
      // King LMS URL はストレージのコース一覧から名前で検索
      urlKingLms  = P.findKingLmsUrl(P.kingLmsCourses || [], title);

      btnSyl.disabled  = !urlSyllabus;
      btnKing.hidden   = !urlKingLms;
      btnKing.disabled = false;

      // メニューを表示してからサイズ確定後に再配置する
      menuEl.hidden = false;
      positionMenu(menuEl, e.clientX, e.clientY);
      P.anim.afterLayout(() => positionMenu(menuEl, e.clientX, e.clientY));
    });

    // ────────────────────────────────────────────
    // メニュー項目クリック
    // ────────────────────────────────────────────

    menuEl.addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('button') : null;
      if (!btn || !menuEl.contains(btn)) return;

      if (btn === btnSyl  && urlSyllabus) window.open(urlSyllabus, '_blank', 'noopener,noreferrer');
      if (btn === btnKing && urlKingLms)  window.open(urlKingLms,  '_blank', 'noopener,noreferrer');

      close();
    });

    // ────────────────────────────────────────────
    // メニュー外クリックで閉じる
    // ────────────────────────────────────────────

    document.addEventListener('pointerdown', (e) => {
      if (menuEl.hidden) return;
      if (menuEl.contains(e.target)) return;
      close();
    }, true);

    // Escape キーは boot.js で一括管理するため、ここでは登録しない

    return { close, isOpen };
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  P.createKogiContextMenu = createKogiContextMenu;

})(typeof globalThis !== 'undefined' ? globalThis : window);
