/**
 * calendar/grid-builder.js — カレンダーグリッド HTML 生成
 *
 * ロード順: document_idle（calendar/kogi-helpers.js の後）。
 *
 * カレンダーイベントの配列と表示範囲・メタ情報から、
 * グリッド HTML 文字列を生成する純粋関数を提供する。
 *
 * DOM への書き込みは行わない（書き込みはコントローラーが担当する）。
 *
 * 公開: P.buildCalendarGridHtml, P.clearCalBodyLoadingAttrs
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // カレンダーグリッドの曜日ヘッダー（月曜始まり）
  const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

  // ────────────────────────────────────────────
  // ローディング状態の後処理
  // ────────────────────────────────────────────

  /**
   * カレンダー本体要素のローディング属性と固定高さを除去する。
   * データ受信後、グリッドを描画する直前に呼ぶ。
   *
   * @param {Element | null | undefined} mount
   */
  function clearCalBodyLoadingAttrs(mount) {
    if (mount?.dataset) {
      delete mount.dataset.calLoading;
      delete mount.dataset.calMode;
    }
    if (mount?.style) mount.style.minHeight = '';
  }

  // ────────────────────────────────────────────
  // グリッド HTML 生成
  // ────────────────────────────────────────────

  /**
   * カレンダーグリッドの HTML 文字列を生成する。
   *
   * @param {unknown[]} items       - API から取得したイベント配列
   * @param {{ start: string, end: string }} range - 表示範囲（ISO 日付、end は含まない）
   * @param {{
   *   mode: 'week' | 'month',
   *   monthRef: { y: number, m: number } | null,
   *   calLinkKingLms: boolean,
   *   kingLmsCourses: unknown[],
   *   calKind: string,
   * }} viewMeta - 表示設定
   * @returns {string} グリッド HTML
   */
  function buildCalendarGridHtml(items, range, viewMeta) {
    if (!range?.start || !range?.end) {
      return '<p class="p-empty">カレンダー範囲を取得できませんでした</p>';
    }

    const days = P.enumerateRange(range.start, range.end);
    if (days.length === 0) {
      return '<p class="p-empty">表示できる日付がありません</p>';
    }

    const mode           = viewMeta?.mode === 'month' ? 'month' : 'week';
    const monthRef       = viewMeta?.monthRef ?? null;
    const calLinkKingLms = !!viewMeta?.calLinkKingLms;
    const kingLmsCourses = Array.isArray(viewMeta?.kingLmsCourses) ? viewMeta.kingLmsCourses : [];
    const calKind        = viewMeta?.calKind || '';
    const todayIso       = P.toIsoLocal(new Date());

    // イベントを日付ごとにグループ化する
    // item.start が "YYYY-MM-DDT..." 形式の場合も正しく "YYYY-MM-DD" に正規化する
    const byDay = new Map();
    for (const item of (Array.isArray(items) ? items : [])) {
      const day = P.calEventDayIso(item);
      if (!day) continue;
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(item);
    }

    // 曜日ヘッダー行
    const heads = WEEKDAY_LABELS
      .map((w) => `<div class="p-cal-wd">${w}</div>`)
      .join('');

    // 各日のセル HTML を生成する
    const cells = days.map((iso) => {
      const d       = P.parseIsoLocal(iso);
      const label   = `${d.getMonth() + 1}/${d.getDate()}`;
      const isToday = iso === todayIso;

      // 月表示で当月以外の日はグレーアウトする
      const isMuted = mode === 'month' && monthRef
        ? (d.getFullYear() !== monthRef.y || d.getMonth() !== monthRef.m)
        : false;

      const dayItems = [...(byDay.get(iso) || [])];

      // 授業カレンダーは時限順にソートする
      if (calKind === 'kogi') {
        dayItems.sort((a, b) => {
          const pa = P.kogiPeriodNum(a);
          const pb = P.kogiPeriodNum(b);
          if (pa === null && pb === null) return 0;
          if (pa === null) return 1;
          if (pb === null) return -1;
          return pa - pb;
        });
      }

      // イベント HTML を生成する（空きコマスペーサー挿入含む）
      const evHtml = buildDayEventsHtml(dayItems, { calKind, mode, calLinkKingLms, kingLmsCourses });

      const cls      = ['p-cal-cell', isMuted && 'is-muted', isToday && 'is-today'].filter(Boolean).join(' ');
      const ariaCur  = isToday ? ' aria-current="date"' : '';

      return `<div class="${cls}"${ariaCur}>`
        + `<div class="p-cal-day-num">${P.esc(label)}</div>`
        + `<div class="p-cal-day-body">${evHtml}</div>`
        + `</div>`;
    }).join('');

    return `<div class="p-cal-grid is-${mode}">${heads}${cells}</div>`;
  }

  // ────────────────────────────────────────────
  // 1日分のイベント HTML 生成
  // ────────────────────────────────────────────

  /**
   * 1日分のイベント配列から HTML を生成する。
   * 授業カレンダーは空きコマにスペーサーを挿入する。
   *
   * @param {unknown[]} dayItems - その日のイベント配列（時限順ソート済み）
   * @param {{
   *   calKind: string,
   *   mode: 'week' | 'month',
   *   calLinkKingLms: boolean,
   *   kingLmsCourses: unknown[],
   * }} opts
   * @returns {string}
   */
  function buildDayEventsHtml(dayItems, opts) {
    const { calKind, mode, calLinkKingLms, kingLmsCourses } = opts;
    const parts = [];
    let prevPeriod = null; // 前の授業の時限番号（スペーサー挿入用）

    for (const ev of dayItems) {
      const { period: periodFromTip, room } = P.parseKogiMeta(ev.tooltip);
      const { firstNum }                   = P.parseLeadingPeriodTitle(ev.title);
      const period                         = periodFromTip || firstNum;
      const pNum                           = calKind === 'kogi' ? P.kogiPeriodNum(ev) : null;

      const kogiMeta = [period && `時限 ${period}`, room].filter(Boolean).join(' · ');
      const meta     = (ev && ev.calMeta != null && String(ev.calMeta).trim() !== '')
        ? String(ev.calMeta).trim()
        : kogiMeta;

      // ── 空きコマスペーサーの挿入 ──
      if (calKind === 'kogi' && pNum !== null) {
        const gapFrom = prevPeriod === null ? 1 : prevPeriod + 1;
        for (let g = gapFrom; g < pNum; g++) {
          parts.push('<div class="p-cal-ev-gap" aria-hidden="true"></div>');
        }
      }

      // ── イベントセル本体 ──
      const tipPlain = P.plainFromHtml(ev.tooltip);
      const hrefFromEv = ev && ev.href != null ? String(ev.href).trim() : '';
      const href     = hrefFromEv
        ? hrefFromEv
        : P.kogiEventHref(ev.tooltip, tipPlain, calLinkKingLms, ev.title || '', kingLmsCourses);
      const timeRange = calKind === 'kogi'
        ? P.kogiPeriodTimeRange(period)
        : (ev && ev.calTime != null ? String(ev.calTime) : '');

      // 月表示ではメタ情報（時限・教室）を省略してコンパクトに表示する
      const metaHtml = mode !== 'month' && meta
        ? `<span class="p-cal-ev-meta">${P.esc(meta)}</span>`
        : '';

      // ホバーポップアップ・右クリックメニュー用のデータ属性
      const kindAttr  = calKind ? ` data-cal-kind="${P.escAttr(calKind)}"` : '';
      const dataAttrs = `data-cal-title="${P.escAttr(ev.title || '')}" `
        + `data-cal-meta="${P.escAttr(meta)}" `
        + `data-cal-tip="${P.escAttr(tipPlain)}" `
        + `data-cal-time="${P.escAttr(timeRange)}"${kindAttr}`;

      const inner = `<span class="p-cal-ev-title">${P.esc(ev.title || '')}</span>${metaHtml}`;

      // href がある場合は <a>、ない場合は <div> で描画する
      parts.push(href
        ? `<a class="p-cal-ev" href="${P.escAttr(href)}" target="_blank" rel="noopener noreferrer" ${dataAttrs}>${inner}</a>`
        : `<div class="p-cal-ev" ${dataAttrs}>${inner}</div>`);

      if (pNum !== null) prevPeriod = pNum;
    }

    return parts.join('');
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  Object.assign(P, { buildCalendarGridHtml, clearCalBodyLoadingAttrs });

})(typeof globalThis !== 'undefined' ? globalThis : window);
