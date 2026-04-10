/**
 * useCalendarPanel の postMessage 受信処理（mutable calRef と React setState を束ねる）。
 * use-panel の肥大化を防ぐため、受信ロジックを本ファイルに分離している。
 *
 * メッセージは以下の 3 パターンで処理される。
 *  1. バルクフェッチ完了 — 年単位データを受け取り clientDataMode に移行する
 *  2. clientDataMode かつ非対象レスポンス — 週/月パラメータのみ passive 更新する
 *  3. 通常フェッチ完了 — グリッドを即時再描画し、バルクフェッチをキューに積む
 */

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { addDaysIso } from '../../lib/date';
import { parseCalendarRequest } from '../../lib/api';
import { mergeCalItemLists, rangeKey } from './merge';
import { storeFromParsed, storePassive } from './view-params';
import type { CalParams, CalEvent } from './types';
import type { MonthRef } from '../../lib/date';

/** use-panel 内の calRef.current と同等のミュータブル塊 */
export interface CalendarPanelCalMutable {
  pendingKey:     string | null;
  loading:        boolean;
  bulkFetching:   boolean;
  bulkFetchKind:  null | 'initial' | 'extend-next' | 'extend-prev';
  clientDataMode: boolean;
  bulkItems:      CalEvent[] | null;
  bulkParsed:     { start: string; end: string } | null;
  pendingExtend:    null | { weekParams?: CalParams; monthRef?: MonthRef };
  pendingEnterAnim: boolean;
  swipeAnimating:   boolean;
  lastItems:      CalEvent[];
  lastParsed:     CalParams | null;
  storedUKbn:     string;
}

export interface CalendarPanelInboundContext {
  msgType: string;
  calRef: RefObject<CalendarPanelCalMutable>;
  weekParamsRef: RefObject<CalParams | null>;
  monthRefRef: RefObject<MonthRef | null>;
  viewModeRef: RefObject<'week' | 'month'>;
  setWeekParams: Dispatch<SetStateAction<CalParams | null>>;
  setMonthRef: Dispatch<SetStateAction<MonthRef | null>>;
  redrawFromClient: (opts?: { enterAnim?: boolean }) => void;
  redraw: (items: CalEvent[], parsed: CalParams, opts?: { enterAnim?: boolean }) => void;
  queueBulkYearFetch: () => void;
}

export function runCalendarPanelInboundMessage(
  d: Record<string, unknown>,
  ctx: CalendarPanelInboundContext,
): void {
  if (d.type !== ctx.msgType) return;
  if (!Array.isArray(d.items)) return;

  const parsed = d.requestUrl ? parseCalendarRequest(String(d.requestUrl)) : null;
  if (!parsed) return;

  const m       = ctx.calRef.current;
  const key     = rangeKey(parsed.start, parsed.end);
  const isMonth = parsed.end === addDaysIso(parsed.start, 42);
  const matches = m.pendingKey !== null && key === m.pendingKey;

  // ── [1] バルクフェッチ完了 ────────────────────────────────────────────────
  // 年単位のデータを受け取り、extend か initial かに応じてマージし clientDataMode へ移行する。
  // pendingExtend がある場合は、あらかじめキューに積んでいた週/月移動をここで確定させる。
  if (matches && m.bulkFetching) {
    m.bulkFetching  = false;
    m.pendingKey    = null;
    m.loading       = false;
    const items     = d.items as CalEvent[];
    const kind      = m.bulkFetchKind;
    m.bulkFetchKind = null;

    if (kind === 'extend-next' && m.bulkParsed) {
      m.bulkItems  = mergeCalItemLists(m.bulkItems ?? [], items);
      m.bulkParsed = { start: m.bulkParsed.start, end: parsed.end };
    } else if (kind === 'extend-prev' && m.bulkParsed) {
      m.bulkItems  = mergeCalItemLists(items, m.bulkItems ?? []);
      m.bulkParsed = { start: parsed.start, end: m.bulkParsed.end };
    } else {
      m.bulkItems      = items.length ? items : m.lastItems.length ? [...m.lastItems] : items;
      m.bulkParsed     = parsed;
      m.clientDataMode = true;
    }

    if (m.pendingExtend) {
      if (m.pendingExtend.weekParams) {
        ctx.setWeekParams(m.pendingExtend.weekParams);
        ctx.weekParamsRef.current = m.pendingExtend.weekParams;
      }
      if (m.pendingExtend.monthRef) {
        ctx.setMonthRef(m.pendingExtend.monthRef);
        ctx.monthRefRef.current = m.pendingExtend.monthRef;
      }
      m.pendingExtend = null;
    }

    ctx.redrawFromClient({ enterAnim: false });
    return;
  }

  // ── [2] clientDataMode 中の非対象レスポンス ───────────────────────────────
  // バルクデータ保持中にポータルが自動フェッチしたレスポンスが流れ込む場合がある。
  // グリッドは再描画せず、最新の週/月パラメータのみ passive 更新する。
  if (m.clientDataMode && m.bulkParsed) {
    m.storedUKbn = parsed.uKbn || m.storedUKbn;
    const passive = storePassive(parsed, isMonth, ctx.weekParamsRef.current, ctx.monthRefRef.current);
    if (passive.weekParams && passive.weekParams !== ctx.weekParamsRef.current) {
      ctx.setWeekParams(passive.weekParams);
      ctx.weekParamsRef.current = passive.weekParams;
    }
    if (passive.monthRef && passive.monthRef !== ctx.monthRefRef.current) {
      ctx.setMonthRef(passive.monthRef);
      ctx.monthRefRef.current = passive.monthRef;
    }
    return;
  }

  // ── [2b] 別の pendingKey に対するレスポンス、または古い loading 中レスポンス ─
  // ナビゲーション操作が重なった場合など、現在の pendingKey と一致しないレスポンスを
  // 受け取ることがある。グリッドは更新せず、パラメータの passive 更新だけ行う。
  if ((m.pendingKey !== null && !matches) || (!m.pendingKey && m.loading)) {
    m.storedUKbn = parsed.uKbn || m.storedUKbn;
    const passive = storePassive(parsed, isMonth, ctx.weekParamsRef.current, ctx.monthRefRef.current);
    if (passive.weekParams && passive.weekParams !== ctx.weekParamsRef.current) {
      ctx.setWeekParams(passive.weekParams);
      ctx.weekParamsRef.current = passive.weekParams;
    }
    if (passive.monthRef && passive.monthRef !== ctx.monthRefRef.current) {
      ctx.setMonthRef(passive.monthRef);
      ctx.monthRefRef.current = passive.monthRef;
    }
    return;
  }

  // ── [3] 通常フェッチ完了 ─────────────────────────────────────────────────
  // 週/月ナビゲーションによる直接フェッチのレスポンス。グリッドを即時再描画し、
  // バルクフェッチをキューに積んで次回のクライアントサイドナビゲーションに備える。
  m.pendingKey = null;
  m.loading    = false;
  m.storedUKbn = parsed.uKbn || m.storedUKbn;

  const sf = storeFromParsed(parsed, isMonth, ctx.weekParamsRef.current, ctx.monthRefRef.current);
  ctx.setWeekParams(sf.weekParams);
  ctx.weekParamsRef.current = sf.weekParams;
  ctx.setMonthRef(sf.monthRef);
  ctx.monthRefRef.current   = sf.monthRef;

  const items = d.items as CalEvent[];
  m.lastItems  = items;
  m.lastParsed = parsed;

  const enterAnim    = m.pendingEnterAnim;
  m.pendingEnterAnim = false;
  ctx.redraw(items, parsed, { enterAnim });
  window.setTimeout(() => ctx.queueBulkYearFetch(), 0);
}
