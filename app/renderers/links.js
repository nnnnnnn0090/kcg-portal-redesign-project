/**
 * renderers/links.js — ショートカットリンクの描画・編集
 *
 * ロード順: document_idle（renderers/news.js の後）。
 *
 * 通常モードとインライン編集モードを持つ。
 * 編集モードではドラッグで並替え、非表示トグル、カスタムリンク追加ができる。
 *
 * ストレージ形式（SK.shortcutConfig）:
 *   { order: string[],  hidden: string[],  custom: Array<{id,midashi,url}> }
 *   order  — URL をキーとした表示順。未登録は末尾。
 *   hidden — 非表示にした URL 一覧。
 *   custom — ユーザー追加リンク（id は "custom-" 接頭辞の一意文字列）。
 *
 * 公開: P.createLinkEditor(mount, editBtn, onSave)
 *       → { render(items, extras, cfg), getConfig(), destroy() }
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  /**
   * URL からリンクの一意キーを生成する。
   * @param {string} url
   * @returns {string}
   */
  function linkKey(url) { return String(url || '').replace(/\/+$/, ''); }

  /**
   * ショートカットリンクエディタを生成する。
   *
   * @param {Element} mount       - p-links 描画先（panel-body）
   * @param {Element} editBtn     - 編集ボタン要素
   * @param {(cfg: object) => void} onSave - 設定変更時の永続化コールバック
   * @returns {{ render, getConfig, destroy }}
   */
  function createLinkEditor(mount, editBtn, onSave) {
    if (!mount || !editBtn) return { render() {}, getConfig: () => ({}), destroy() {} };

    let editing     = false;
    let rows        = [];   // 現在の統合リスト [{key,midashi,url,biko?,isCustom}]
    let config      = { order: [], hidden: [], custom: [] };
    let lastItems   = [];   // 直近の API レスポンス
    let lastExtras  = [];   // 直近の extras

    // ドラッグ状態
    let dragSrcIdx = -1;
    let dragOverIdx = -1;

    // ── 統合リスト構築 ──────────────────────────

    function buildRows(items, extras) {
      const extraRows = Array.isArray(extras) ? extras.filter((i) => i.midashi && i.url) : [];
      const extraUrls = new Set(extraRows.map((i) => linkKey(i.url)));

      const fromApi = Array.isArray(items)
        ? items.filter((i) => i.midashi && i.url && !extraUrls.has(linkKey(i.url)))
        : [];

      const customRows = Array.isArray(config.custom)
        ? config.custom.filter((c) => c.midashi && c.url)
        : [];

      const allRaw = [
        ...extraRows.map((r) => ({ key: linkKey(r.url), midashi: r.midashi, url: r.url, biko: r.biko || '', isCustom: false })),
        ...fromApi.map((r) => ({ key: linkKey(r.url), midashi: r.midashi, url: r.url, biko: r.biko || '', isCustom: false })),
        ...customRows.map((r) => ({ key: linkKey(r.url), midashi: r.midashi, url: r.url, biko: '', isCustom: true, customId: r.id })),
      ];

      // 重複排除（同一キーは先勝ち）
      const seen = new Set();
      const deduped = [];
      for (const r of allRaw) {
        if (seen.has(r.key)) continue;
        seen.add(r.key);
        deduped.push(r);
      }

      // order に従ってソート（order 未登録は末尾、元順維持）
      const orderMap = new Map();
      if (Array.isArray(config.order)) {
        config.order.forEach((k, i) => orderMap.set(k, i));
      }
      deduped.sort((a, b) => {
        const ai = orderMap.has(a.key) ? orderMap.get(a.key) : 99999;
        const bi = orderMap.has(b.key) ? orderMap.get(b.key) : 99999;
        return ai - bi;
      });

      return deduped;
    }

    function isHidden(key) {
      return Array.isArray(config.hidden) && config.hidden.includes(key);
    }

    function visibleRows() {
      return rows.filter((r) => !isHidden(r.key));
    }

    // ── order を現在の rows から再構築 ──────────

    function syncOrderFromRows() {
      config.order = rows.map((r) => r.key);
    }

    // ── 描画 ────────────────────────────────────

    function renderNormal() {
      const vis = visibleRows();
      if (vis.length === 0) {
        P.setHtml(mount, '<p class="p-empty">ショートカットがありません</p>');
        return;
      }
      P.setHtml(mount, `<div class="p-link-list">${vis.map((r) =>
        `<a class="p-link" href="${P.escAttr(r.url)}" target="_blank" rel="noopener noreferrer">
  <span class="p-link-title">${P.esc(r.midashi)}</span>
  ${r.biko ? `<span class="p-link-meta">${P.esc(r.biko)}</span>` : ''}
</a>`).join('')}</div>`);
    }

    function renderEdit() {
      const listHtml = rows.map((r, i) => {
        const hidden = isHidden(r.key);
        return `<div class="p-link-edit-item${hidden ? ' is-hidden' : ''}" data-idx="${i}" draggable="true">
  <span class="p-link-edit-grip" aria-hidden="true" title="ドラッグで並べ替え">⋮⋮</span>
  <span class="p-link-edit-name">${P.esc(r.midashi)}</span>
  <button type="button" class="p-link-edit-vis" data-key="${P.escAttr(r.key)}" title="${hidden ? 'ホームに表示する' : 'ホームで非表示にする'}" aria-label="${hidden ? 'ホームに表示する' : 'ホームで非表示にする'}">${hidden ? '表示' : '隠す'}</button>
  ${r.isCustom ? `<button type="button" class="p-link-edit-del" data-custom-id="${P.escAttr(r.customId)}" title="削除" aria-label="削除">×</button>` : ''}
</div>`;
      }).join('');

      P.setHtml(mount, `<div class="p-link-edit-list">${listHtml}</div>
<div class="p-link-add-form">
  <input type="text" class="p-link-add-input" id="p-link-add-name" placeholder="リンク名" autocomplete="off">
  <input type="url"  class="p-link-add-input" id="p-link-add-url"  placeholder="URL (https://…)" autocomplete="off">
  <button type="button" class="p-link-add-btn" id="p-link-add-submit">追加</button>
</div>`);

      wireEditEvents();
    }

    function redraw() {
      if (editing) renderEdit();
      else renderNormal();
    }

    // ── 編集モード切替 ──────────────────────────

    function enterEdit() {
      editing = true;
      editBtn.textContent = '完了';
      editBtn.classList.add('is-active');
      mount.classList.add('is-editing');
      redraw();
    }

    function exitEdit() {
      editing = false;
      editBtn.textContent = '編集';
      editBtn.classList.remove('is-active');
      mount.classList.remove('is-editing');
      syncOrderFromRows();
      save();
      redraw();
    }

    function toggleEdit() {
      if (editing) exitEdit();
      else enterEdit();
    }

    // ── ストレージ保存 ──────────────────────────

    function save() {
      syncOrderFromRows();
      onSave({
        order:  config.order,
        hidden: config.hidden,
        custom: config.custom,
      });
    }

    // ── 編集モードイベント配線 ──────────────────

    function wireEditEvents() {
      // 表示/非表示トグル
      mount.querySelectorAll('.p-link-edit-vis').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          if (!key) return;
          const idx = config.hidden.indexOf(key);
          if (idx >= 0) config.hidden.splice(idx, 1);
          else config.hidden.push(key);
          save();
          redraw();
        });
      });

      // カスタムリンク削除
      mount.querySelectorAll('.p-link-edit-del').forEach((btn) => {
        btn.addEventListener('click', () => {
          const cid = btn.dataset.customId;
          config.custom = config.custom.filter((c) => c.id !== cid);
          rows = rows.filter((r) => !(r.isCustom && r.customId === cid));
          save();
          redraw();
        });
      });

      // リンク追加
      const submitBtn = mount.querySelector('#p-link-add-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          const nameInput = mount.querySelector('#p-link-add-name');
          const urlInput  = mount.querySelector('#p-link-add-url');
          const name = (nameInput?.value || '').trim();
          const url  = (urlInput?.value || '').trim();
          if (!name || !url) return;
          try { new URL(url); } catch { return; }
          const id = 'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
          const entry = { id, midashi: name, url };
          config.custom.push(entry);
          rows.push({ key: linkKey(url), midashi: name, url, biko: '', isCustom: true, customId: id });
          save();
          redraw();
        });
      }

      // ドラッグ & ドロップ
      const editList = mount.querySelector('.p-link-edit-list');
      if (!editList) return;

      editList.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.p-link-edit-item');
        if (!item) return;
        dragSrcIdx = Number(item.dataset.idx);
        item.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(dragSrcIdx));
      });

      editList.addEventListener('dragend', (e) => {
        dragSrcIdx = -1;
        dragOverIdx = -1;
        editList.querySelectorAll('.p-link-edit-item').forEach((el) => {
          el.classList.remove('is-dragging', 'is-drag-over');
        });
      });

      editList.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const item = e.target.closest('.p-link-edit-item');
        if (!item) return;
        const idx = Number(item.dataset.idx);
        if (idx === dragOverIdx) return;
        dragOverIdx = idx;
        editList.querySelectorAll('.p-link-edit-item').forEach((el) => {
          el.classList.toggle('is-drag-over', Number(el.dataset.idx) === idx);
        });
      });

      editList.addEventListener('drop', (e) => {
        e.preventDefault();
        const item = e.target.closest('.p-link-edit-item');
        if (!item) return;
        const toIdx = Number(item.dataset.idx);
        if (dragSrcIdx < 0 || dragSrcIdx === toIdx) return;
        const [moved] = rows.splice(dragSrcIdx, 1);
        rows.splice(toIdx, 0, moved);
        syncOrderFromRows();
        save();
        redraw();
      });

      // タッチ対応ドラッグ
      let touchItem = null;
      let touchClone = null;
      let touchStartIdx = -1;
      let touchCurrentIdx = -1;

      editList.addEventListener('touchstart', (e) => {
        const grip = e.target.closest('.p-link-edit-grip');
        if (!grip) return;
        const item = grip.closest('.p-link-edit-item');
        if (!item) return;
        e.preventDefault();
        touchItem = item;
        touchStartIdx = Number(item.dataset.idx);
        touchCurrentIdx = touchStartIdx;
        item.classList.add('is-dragging');

        touchClone = item.cloneNode(true);
        touchClone.classList.add('p-link-edit-ghost');
        const rect = item.getBoundingClientRect();
        touchClone.style.width = rect.width + 'px';
        mount.appendChild(touchClone);
        positionTouchClone(e.touches[0]);
      }, { passive: false });

      function positionTouchClone(touch) {
        if (!touchClone) return;
        touchClone.style.top = (touch.clientY - 24) + 'px';
        touchClone.style.left = (touch.clientX - 24) + 'px';
      }

      editList.addEventListener('touchmove', (e) => {
        if (!touchItem) return;
        e.preventDefault();
        const touch = e.touches[0];
        positionTouchClone(touch);
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const over = el?.closest('.p-link-edit-item');
        editList.querySelectorAll('.p-link-edit-item').forEach((n) => n.classList.remove('is-drag-over'));
        if (over && over !== touchItem) {
          over.classList.add('is-drag-over');
          touchCurrentIdx = Number(over.dataset.idx);
        }
      }, { passive: false });

      function finishTouch() {
        if (!touchItem) return;
        if (touchStartIdx >= 0 && touchCurrentIdx >= 0 && touchStartIdx !== touchCurrentIdx) {
          const [moved] = rows.splice(touchStartIdx, 1);
          rows.splice(touchCurrentIdx, 0, moved);
          syncOrderFromRows();
          save();
        }
        touchItem.classList.remove('is-dragging');
        if (touchClone) { touchClone.remove(); touchClone = null; }
        touchItem = null;
        touchStartIdx = -1;
        touchCurrentIdx = -1;
        editList.querySelectorAll('.p-link-edit-item').forEach((n) => n.classList.remove('is-drag-over'));
        redraw();
      }

      editList.addEventListener('touchend', finishTouch, { passive: false });
      editList.addEventListener('touchcancel', finishTouch, { passive: false });
    }

    // ── 公開 API ────────────────────────────────

    editBtn.addEventListener('click', toggleEdit);

    /**
     * データを受け取って描画する。
     * @param {unknown[] | undefined} items   - API リンク配列。省略時は直前の一覧を維持（ストレージ適用が API より遅いときに空配列で上書きしない）
     * @param {Array<{midashi:string,url:string}> | undefined} extras
     * @param {object} [savedCfg]
     */
    function render(items, extras, savedCfg) {
      if (savedCfg && typeof savedCfg === 'object') {
        config.order  = Array.isArray(savedCfg.order)  ? savedCfg.order  : [];
        config.hidden = Array.isArray(savedCfg.hidden) ? savedCfg.hidden : [];
        config.custom = Array.isArray(savedCfg.custom) ? savedCfg.custom : [];
      }
      if (items !== undefined) lastItems = Array.isArray(items) ? items : [];
      if (extras !== undefined) lastExtras = Array.isArray(extras) ? extras : [];
      rows = buildRows(lastItems, lastExtras);
      redraw();
    }

    function getConfig() {
      syncOrderFromRows();
      return { order: config.order, hidden: config.hidden, custom: config.custom };
    }

    function destroy() {
      editBtn.removeEventListener('click', toggleEdit);
    }

    return { render, getConfig, destroy };
  }

  P.createLinkEditor = createLinkEditor;

})(typeof globalThis !== 'undefined' ? globalThis : window);
