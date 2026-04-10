/**
 * カレンダーグリッドの HTML 文字列を構築するピュア関数群。
 * DOM 操作は行わず、`buildCalendarGridHtml` が返す文字列を `calBody.innerHTML` に設定する。
 */

import { enumerateRange, parseIsoLocal, toIsoLocal, calEventDayIso } from '../../lib/date';
import { esc, escAttr, plainFromHtml } from '../../lib/dom';
import { parseKogiMeta, parseLeadingPeriodTitle, kogiPeriodNum, kogiPeriodTimeRange, kogiEventHref } from './kogi';
import type { CalEvent, ViewMeta } from './types';

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

// ─── 1 日分のイベント HTML ────────────────────────────────────────────────

function buildDayEventsHtml(dayItems: CalEvent[], opts: ViewMeta): string {
  const { calKind, mode, calLinkKingLms, kingLmsCourses } = opts;
  const parts: string[] = [];
  let prevPeriod: number | null = null;

  for (const ev of dayItems) {
    const { period: periodFromTip, room } = parseKogiMeta(ev.tooltip ?? '');
    const { firstNum }                   = parseLeadingPeriodTitle(ev.title ?? '');
    const period                         = periodFromTip || firstNum;
    const pNum                           = calKind === 'kogi' ? kogiPeriodNum(ev) : null;
    const kogiMeta = [period && `時限 ${period}`, room].filter(Boolean).join(' · ');
    const meta = String(ev.calMeta ?? '').trim() || kogiMeta;

    // kogi カレンダーでは時限の空きを視覚的に表すギャップ要素を挿入する
    if (calKind === 'kogi' && pNum !== null) {
      const gapFrom = prevPeriod === null ? 1 : prevPeriod + 1;
      for (let g = gapFrom; g < pNum; g++) {
        parts.push('<div class="p-cal-ev-gap" aria-hidden="true"></div>');
      }
    }

    const tipPlain    = plainFromHtml(ev.tooltip ?? '');
    const hrefFromEv  = String(ev.href ?? '').trim();
    const href        = hrefFromEv || kogiEventHref(ev.tooltip ?? '', ev.title ?? '', calLinkKingLms, kingLmsCourses);
    const timeRange   = calKind === 'kogi' ? kogiPeriodTimeRange(period) : String(ev.calTime ?? '');

    const metaHtml  = mode !== 'month' && meta ? `<span class="p-cal-ev-meta">${esc(meta)}</span>` : '';
    const kindAttr  = calKind ? ` data-cal-kind="${escAttr(calKind)}"` : '';
    const dataAttrs = `data-cal-title="${escAttr(ev.title ?? '')}" `
      + `data-cal-meta="${escAttr(meta)}" `
      + `data-cal-tip="${escAttr(tipPlain)}" `
      + `data-cal-time="${escAttr(timeRange)}"${kindAttr}`;
    const inner = `<span class="p-cal-ev-title">${esc(ev.title ?? '')}</span>${metaHtml}`;

    parts.push(href
      ? `<a class="p-cal-ev" href="${escAttr(href)}" target="_blank" rel="noopener noreferrer" ${dataAttrs}>${inner}</a>`
      : `<div class="p-cal-ev" ${dataAttrs}>${inner}</div>`);

    if (pNum !== null) prevPeriod = pNum;
  }
  return parts.join('');
}

// ─── グリッド HTML ─────────────────────────────────────────────────────────

/**
 * カレンダーグリッドの HTML 文字列を構築する。
 * DOM 操作は行わず HTML 文字列を返す（calBody.innerHTML に設定される）。
 */
export function buildCalendarGridHtml(
  items: CalEvent[],
  range: { start: string; end: string },
  viewMeta: ViewMeta,
): string {
  if (!range?.start || !range?.end) {
    return '<p class="p-empty">カレンダー範囲を取得できませんでした</p>';
  }

  const days = enumerateRange(range.start, range.end);
  if (days.length === 0) return '<p class="p-empty">表示できる日付がありません</p>';

  const mode           = viewMeta?.mode === 'month' ? 'month' : 'week';
  const monthRef       = viewMeta?.monthRef ?? null;
  const calLinkKingLms = !!viewMeta?.calLinkKingLms;
  const kingLmsCourses = Array.isArray(viewMeta?.kingLmsCourses) ? viewMeta.kingLmsCourses : [];
  const calKind        = viewMeta?.calKind ?? '';
  const todayIso       = toIsoLocal(new Date());

  // イベントを日付でグループ化
  const byDay = new Map<string, CalEvent[]>();
  for (const item of (Array.isArray(items) ? items : [])) {
    const day = calEventDayIso(item);
    if (!day) continue;
    const bucket = byDay.get(day);
    if (bucket) bucket.push(item);
    else byDay.set(day, [item]);
  }

  const heads = WEEKDAY_LABELS.map((w) => `<div class="p-cal-wd">${w}</div>`).join('');

  const cells = days.map((iso) => {
    const d       = parseIsoLocal(iso);
    const label   = `${d.getMonth() + 1}/${d.getDate()}`;
    const isToday = iso === todayIso;
    // 月表示で対象月以外のセルを淡色にする
    const isMuted = mode === 'month' && monthRef
      ? (d.getFullYear() !== monthRef.y || d.getMonth() !== monthRef.m)
      : false;

    const dayItems = [...(byDay.get(iso) ?? [])];
    if (calKind === 'kogi') {
      // kogi は時限順でソート（null は末尾）
      dayItems.sort((a, b) => {
        const pa = kogiPeriodNum(a);
        const pb = kogiPeriodNum(b);
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return pa - pb;
      });
    }

    const evHtml  = buildDayEventsHtml(dayItems, { calKind, mode, calLinkKingLms, kingLmsCourses, monthRef });
    const cls     = ['p-cal-cell', isMuted && 'is-muted', isToday && 'is-today'].filter(Boolean).join(' ');
    const ariaCur = isToday ? ' aria-current="date"' : '';

    return `<div class="${cls}"${ariaCur}>`
      + `<div class="p-cal-day-num">${esc(label)}</div>`
      + `<div class="p-cal-day-body">${evHtml}</div>`
      + '</div>';
  }).join('');

  return `<div class="p-cal-grid is-${mode}">${heads}${cells}</div>`;
}
