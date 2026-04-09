/**
 * ui/tooltip.js — カレンダーセルホバーツールチップ
 *
 * ロード順: document_idle（ui/toast.js の後）。
 *
 * .p-cal-ev 要素へのマウスオーバーで #p-cal-hover-pop を表示する。
 * イベントは root 要素への委譲で捕捉するため、
 * カレンダーグリッドが再描画されても動き続ける。
 *
 * 公開: P.createCalendarTooltip(root) → { hide }
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // ────────────────────────────────────────────
  // ポップアップ位置計算
  // ────────────────────────────────────────────

  /**
   * ポップアップをアンカー要素の下（または上）に画面内クランプして配置する。
   *
   * @param {Element} popEl    - ポップアップ要素
   * @param {Element} anchor   - アンカー（.p-cal-ev）要素
   */
  function position(popEl, anchor) {
    const r   = anchor.getBoundingClientRect();
    const pad = 10;
    const pw  = popEl.offsetWidth;
    const ph  = popEl.offsetHeight;

    // 水平: アンカー中央揃え、画面端をクランプ
    const left = Math.max(pad, Math.min(
      r.left + r.width / 2 - pw / 2,
      window.innerWidth - pw - pad,
    ));

    // 垂直: アンカー下優先。収まらなければ上に表示
    let top = r.bottom + pad;
    if (top + ph > window.innerHeight - pad) top = r.top - ph - pad;
    top = Math.max(pad, top);

    popEl.style.left = `${left}px`;
    popEl.style.top  = `${top}px`;
  }

  // ────────────────────────────────────────────
  // ツールチップ工場関数
  // ────────────────────────────────────────────

  /**
   * カレンダーセルのホバーツールチップを root 要素に配線する。
   *
   * @param {Element} root - イベント委譲の起点となる要素（#portal-overlay）
   * @returns {{ hide: () => void }}
   */
  function createCalendarTooltip(root) {
    const popEl = document.getElementById('p-cal-hover-pop');
    /** @type {ReturnType<typeof setTimeout> | 0} */
    let hideTimer = 0;

    /** ポップアップを非表示にして内容をクリアする */
    function hide() {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
      if (popEl) { popEl.hidden = true; popEl.replaceChildren(); }
    }

    /**
     * アンカー要素のデータ属性からポップアップの内容を組み立てて表示する。
     * @param {Element} anchor
     */
    function show(anchor) {
      if (!popEl) return;

      const title = anchor.dataset.calTitle || '';
      const meta  = anchor.dataset.calMeta  || '';
      const tip   = (anchor.dataset.calTip  || '').trim();
      const time  = (anchor.dataset.calTime || '').trim();

      if (!title && !meta && !tip && !time) return;

      const parts = [`<div class="p-cal-pop-title">${P.esc(title || '（無題）')}</div>`];
      if (time) parts.push(`<div class="p-cal-pop-time">${P.esc(time)}</div>`);
      if (meta) parts.push(`<div class="p-cal-pop-meta">${P.esc(meta)}</div>`);

      if (tip && tip !== title.trim()) {
        // tipPlain の 3 行目（講義コード等の詳細情報）のみ表示する
        const lines = tip.split('\n').map((l) => l.trimEnd()).filter(Boolean);
        const third = lines[2] || '';
        if (third) {
          parts.push(
            `<div class="p-cal-pop-detail"><div class="p-cal-pop-dline">${P.esc(third)}</div></div>`,
          );
        }
      }

      P.setHtml(popEl, parts.join(''));
      popEl.hidden = false;

      // 2フレーム後にレイアウト確定後のサイズで位置を計算する
      P.anim.afterLayout(() => position(popEl, anchor));
    }

    // ────────────────────────────────────────────
    // イベント配線（委譲）
    // ────────────────────────────────────────────

    root.addEventListener('mouseover', (e) => {
      const hit = e.target instanceof Element ? e.target.closest('.p-cal-ev') : null;
      if (!hit || !root.contains(hit)) return;
      clearTimeout(hideTimer);
      hideTimer = 0;
      show(hit);
    });

    root.addEventListener('mouseout', (e) => {
      const rel = e.relatedTarget;
      if (rel instanceof Node && root.contains(rel)) {
        // root 内の別の .p-cal-ev に移動した場合はそちらに切り替える
        const next = rel instanceof Element ? rel.closest('.p-cal-ev') : null;
        if (next) { clearTimeout(hideTimer); hideTimer = 0; show(next); return; }
      }
      // root 外に出た場合は少し遅延してから非表示にする（誤チラつき防止）
      hideTimer = window.setTimeout(hide, 60);
    });

    // スクロール中は即非表示
    root.addEventListener('scroll', hide, { passive: true, capture: true });
    window.addEventListener('scroll', hide, { passive: true, capture: true });

    return { hide };
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  P.createCalendarTooltip = createCalendarTooltip;

})(typeof globalThis !== 'undefined' ? globalThis : window);
