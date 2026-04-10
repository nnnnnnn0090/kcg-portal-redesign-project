/**
 * ポータルカレンダーパネルのロジックを束ねるカスタムフック。
 * postMessage 受信 → バルクフェッチ管理 → グリッド HTML 更新 → スワイプアニメーションを一元管理する。
 *
 * コールバック内で常に最新の props を参照するために propsRef パターンを使用している。
 * 可変な表示パラメータ（フェッチ状態・バルクデータ等）は calRef にまとめ、
 * React の再レンダーを必要とするものだけ state で管理する。
 */

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  sixWeekRange,
  isoToMonthRef,
  shiftMonthRef,
  type MonthRef,
  prevWeekRange,
  nextWeekRange,
  calendarYearRangeFromIso,
  calendarYearRangeBeforeInclusiveStart,
  filterCalItemsByRange,
} from '../../lib/date';
import { pageFetch } from '../../lib/api';
import { buildCalendarGridHtml } from './grid';
import { usePortalMessage, type PortalCapturedMessage } from '../../hooks/usePortalMessage';
import { rangeKey } from './merge';
import { formatWeekTitle, formatMonthTitle } from './view-params';
import { clearCalBodyLoadingAttrs, applyCalSwipe, setCalBodyHtmlSmooth } from './anim';
import { runCalendarPanelInboundMessage } from './calendar-panel-process-inbound';
import type { CalParams, CalEvent } from './types';

// ─── 設定インターフェース ──────────────────────────────────────────────────

export interface CalendarPanelConfig {
  /** カレンダー API URL ビルダー */
  calUrl: (p: CalParams) => string;
  /** カレンダー種別（kogi / hoshu / campus） */
  calKind: string;
  /** 週/月それぞれのパネルタイトル */
  titles: { week: string; month: string };
  /** 受信する postMessage の type */
  msgType: string;
  /** true のとき、データがない場合パネルを隠す */
  hideWhenEmpty?: boolean;
  /** パネルを強制表示するかどうか（設定から読む） */
  getForceVisible?: () => boolean;
  /** King LMS リンクを使うかどうか（設定から読む） */
  getCalLinkKingLms?: () => boolean;
  /** King LMS コース一覧（設定から読む） */
  getKingLmsCourses?: () => Array<{ displayName?: string; externalAccessUrl?: string }>;
  /** King LMS リンク設定変更時に再描画を促す文字列（変わったら useEffect が走る） */
  kogiDisplayDeps?: string;
  /** 強制表示設定変更時に再描画を促す文字列 */
  forceVisibleDeps?: string;
  /** true のとき、設定でオンなら授業カレンダーにマスコットを載せる（ホームの授業パネルのみ指定） */
  sleepMascotSlot?: boolean;
}

// ─── フック ───────────────────────────────────────────────────────────────

export function useCalendarPanel({
  calUrl,
  calKind,
  titles,
  msgType,
  hideWhenEmpty = false,
  getForceVisible   = () => false,
  getCalLinkKingLms = () => false,
  getKingLmsCourses = () => [],
  kogiDisplayDeps,
  forceVisibleDeps,
}: CalendarPanelConfig) {

  // ── 表示状態 ──────────────────────────────────────────────────────────
  const [viewMode,      setViewMode]      = useState<'week' | 'month'>('week');
  const [weekParams,    setWeekParams]    = useState<CalParams | null>(null);
  const [monthRef,      setMonthRef]      = useState<MonthRef | null>(null);
  const [gridHtml,      setGridHtml]      = useState('');
  const [panelVisible,  setPanelVisible]  = useState(!hideWhenEmpty);
  const [title,         setTitle]         = useState('');

  const calBodyRef         = useRef<HTMLDivElement>(null);
  // アニメーション中は useLayoutEffect による DOM 更新をスキップする
  const skipDomSyncRef     = useRef(false);
  const pendingEnterAnimRef = useRef(false);

  // ── props を ref で保持（コールバック内での古い値参照を防ぐ）──────────
  const propsRef = useRef({ calUrl, calKind, hideWhenEmpty, getForceVisible, getCalLinkKingLms, getKingLmsCourses, msgType });
  propsRef.current = { calUrl, calKind, hideWhenEmpty, getForceVisible, getCalLinkKingLms, getKingLmsCourses, msgType };

  // ── 可変な表示パラメータを ref で保持（state と同期） ─────────────────
  const calRef = useRef({
    pendingKey:     null as string | null,
    loading:        false,
    bulkFetching:   false,
    bulkFetchKind:  null as null | 'initial' | 'extend-next' | 'extend-prev',
    clientDataMode: false,                      // true = バルクデータ持ち（クライアントナビゲーション可）
    bulkItems:      null as CalEvent[] | null,  // 年単位で蓄積したデータ
    bulkParsed:     null as { start: string; end: string } | null,
    pendingExtend:    null as { weekParams?: CalParams; monthRef?: MonthRef } | null,
    pendingEnterAnim: false,
    swipeAnimating:   false,
    lastItems:      [] as CalEvent[],
    lastParsed:     null as CalParams | null,
    storedUKbn:     '1',
  });

  const weekParamsRef  = useRef(weekParams);
  const monthRefRef    = useRef(monthRef);
  const viewModeRef    = useRef(viewMode);
  weekParamsRef.current  = weekParams;
  monthRefRef.current    = monthRef;
  viewModeRef.current    = viewMode;

  // ── ビューメタ（描画時に使う設定まとめ） ────────────────────────────
  const viewMetaForRender = useCallback(() => ({
    mode:           viewModeRef.current,
    monthRef:       viewModeRef.current === 'month' ? monthRefRef.current : null,
    calLinkKingLms: propsRef.current.getCalLinkKingLms(),
    kingLmsCourses: propsRef.current.getKingLmsCourses(),
    calKind:        propsRef.current.calKind,
  }), []);

  // ── 現在表示している範囲の CalParams ─────────────────────────────────
  const visibleParsed = useCallback((): CalParams | null => {
    const m  = calRef.current;
    const uK = m.storedUKbn || weekParamsRef.current?.uKbn;
    if (!uK) return null;
    if (viewModeRef.current === 'month' && monthRefRef.current) {
      const r = sixWeekRange(monthRefRef.current.y, monthRefRef.current.m);
      return { uKbn: uK, ...r };
    }
    if (weekParamsRef.current) return { ...weekParamsRef.current, uKbn: uK };
    return null;
  }, []);

  // ── パネル表示切替 ────────────────────────────────────────────────────
  const applyPanelVisibility = useCallback((html: string, hasItems: boolean, opts?: { enterAnim?: boolean }) => {
    const { hideWhenEmpty: he, getForceVisible: gf } = propsRef.current;
    if (he && !hasItems && !gf()) { setPanelVisible(false); return; }
    setPanelVisible(true);
    pendingEnterAnimRef.current = opts?.enterAnim ?? false;
    setGridHtml(html);
  }, []);

  // ── クライアントサイド再描画（バルクデータ使用） ──────────────────────
  const redrawFromClient = useCallback((opts?: { enterAnim?: boolean }) => {
    const m = calRef.current;
    if (!m.clientDataMode || !m.bulkParsed || m.bulkItems === null) return;
    const vp = visibleParsed();
    if (!vp?.start || !vp?.end) return;

    const filtered = filterCalItemsByRange(m.bulkItems, vp.start, vp.end);
    m.lastItems  = filtered;
    m.lastParsed = vp;

    if (viewModeRef.current === 'week') setTitle(formatWeekTitle(vp.start, vp.end));
    else if (monthRefRef.current) setTitle(formatMonthTitle(monthRefRef.current));

    applyPanelVisibility(buildCalendarGridHtml(filtered, vp, viewMetaForRender()), filtered.length > 0, opts);
  }, [applyPanelVisibility, viewMetaForRender, visibleParsed]);

  // ── 通常の再描画（fetch レスポンス後） ───────────────────────────────
  const redraw = useCallback((items: CalEvent[], parsed: CalParams, opts?: { enterAnim?: boolean }) => {
    const m = calRef.current;
    if (m.clientDataMode && m.bulkParsed) { redrawFromClient(opts); return; }

    if (viewModeRef.current === 'week') setTitle(formatWeekTitle(parsed.start, parsed.end));
    else if (monthRefRef.current) setTitle(formatMonthTitle(monthRefRef.current));

    applyPanelVisibility(buildCalendarGridHtml(items, parsed, viewMetaForRender()), items.length > 0, opts);
  }, [applyPanelVisibility, redrawFromClient, viewMetaForRender]);

  // ── バルク年取得の開始 ────────────────────────────────────────────────
  const queueBulkYearFetch = useCallback(() => {
    const m  = calRef.current;
    const wp = weekParamsRef.current;
    if (m.bulkItems !== null || m.bulkFetching || m.clientDataMode) return;
    const uK = m.storedUKbn || wp?.uKbn;
    if (!uK || !wp || m.loading) return;

    m.bulkFetching  = true;
    m.bulkFetchKind = 'initial';
    const yr        = calendarYearRangeFromIso(wp.start);
    m.pendingKey    = rangeKey(yr.start, yr.end);
    pageFetch(propsRef.current.calUrl({ uKbn: uK, start: yr.start, end: yr.end }));
  }, []);

  // ── ナビゲーション境界チェック（バルク範囲を超えるか） ────────────────
  const atNavBoundary = useCallback((dir: 'prev' | 'next'): boolean => {
    const m = calRef.current;
    if (!m.bulkParsed?.start || !m.bulkParsed?.end) return false;

    if (viewModeRef.current === 'week' && weekParamsRef.current) {
      const p = dir === 'prev' ? prevWeekRange(weekParamsRef.current) : nextWeekRange(weekParamsRef.current);
      return dir === 'prev' ? p.start < m.bulkParsed.start : p.end > m.bulkParsed.end;
    }

    if (viewModeRef.current === 'month' && monthRefRef.current) {
      const cand      = shiftMonthRef(monthRefRef.current, dir === 'prev' ? -1 : 1);
      const candStart = `${cand.y}-${String(cand.m + 1).padStart(2, '0')}-01`;
      const nextMStart = cand.m === 11
        ? `${cand.y + 1}-01-01`
        : `${cand.y}-${String(cand.m + 2).padStart(2, '0')}-01`;
      return candStart < m.bulkParsed.start || nextMStart > m.bulkParsed.end;
    }
    return false;
  }, []);

  // ── バルク範囲の延長フェッチ ──────────────────────────────────────────
  const queueBulkExtend = useCallback((dir: 'next' | 'prev') => {
    const m  = calRef.current;
    if (m.bulkFetching || m.loading || m.swipeAnimating) return;
    const uK = m.storedUKbn || weekParamsRef.current?.uKbn;
    if (!uK || !m.bulkParsed) return;

    const yr = dir === 'next'
      ? calendarYearRangeFromIso(m.bulkParsed.end)
      : calendarYearRangeBeforeInclusiveStart(m.bulkParsed.start);

    m.bulkFetchKind = dir === 'next' ? 'extend-next' : 'extend-prev';

    if (viewModeRef.current === 'week' && weekParamsRef.current) {
      const np = dir === 'next' ? nextWeekRange(weekParamsRef.current) : prevWeekRange(weekParamsRef.current);
      m.pendingExtend = { weekParams: np, monthRef: isoToMonthRef(np.start) };
    } else if (viewModeRef.current === 'month' && monthRefRef.current) {
      m.pendingExtend = { monthRef: shiftMonthRef(monthRefRef.current, dir === 'next' ? 1 : -1) };
    } else {
      m.bulkFetchKind = null;
      return;
    }

    m.bulkFetching = true;
    m.pendingKey   = rangeKey(yr.start, yr.end);
    pageFetch(propsRef.current.calUrl({ uKbn: uK, start: yr.start, end: yr.end }));
  }, []);

  // ── postMessage ハンドラ（usePortalMessage と信頼条件を共有） ───────────
  const handleCapturedMessage = useCallback((msg: PortalCapturedMessage) => {
    runCalendarPanelInboundMessage(msg as unknown as Record<string, unknown>, {
      msgType:       propsRef.current.msgType,
      calRef,
      weekParamsRef,
      monthRefRef,
      viewModeRef,
      setWeekParams,
      setMonthRef,
      redrawFromClient,
      redraw,
      queueBulkYearFetch,
    });
  }, [queueBulkYearFetch, redraw, redrawFromClient]);

  usePortalMessage(handleCapturedMessage, { msgTypes: [msgType] });

  // ── DOM 同期（gridHtml の変更を calBody に反映） ─────────────────────
  useLayoutEffect(() => {
    const el = calBodyRef.current;
    if (!el || !panelVisible || skipDomSyncRef.current) return;
    clearCalBodyLoadingAttrs(el);
    const playEnter = pendingEnterAnimRef.current;
    pendingEnterAnimRef.current = false;
    setCalBodyHtmlSmooth(el, gridHtml, undefined, { playEnterAnim: playEnter });
  }, [gridHtml, panelVisible]);

  // ── 直接フェッチ（月移動など） ────────────────────────────────────────
  const fetchRange = useCallback((params: CalParams, opts?: { lockBodyHeight?: boolean }) => {
    const m   = calRef.current;
    if (m.loading || m.swipeAnimating) return;
    const uKbn = params.uKbn || m.storedUKbn || weekParamsRef.current?.uKbn;
    if (!uKbn) return;
    m.pendingKey = rangeKey(params.start, params.end);
    m.loading    = true;
    if (propsRef.current.hideWhenEmpty) setPanelVisible(true);
    const body = calBodyRef.current;
    if (body) {
      body.dataset.calLoading = '';
      body.dataset.calMode    = viewModeRef.current;
      if (opts?.lockBodyHeight) {
        const h = Math.round(body.getBoundingClientRect().height);
        if (h > 64) body.style.minHeight = `${h}px`;
      } else {
        body.style.minHeight = '';
      }
    }
    pendingEnterAnimRef.current = false;
    setGridHtml('<p class="p-empty p-cal-loading-msg">読み込み中…</p>');
    pageFetch(propsRef.current.calUrl({ uKbn, start: params.start, end: params.end }));
  }, []);

  // ── クライアントサイドナビゲーション ─────────────────────────────────
  const navigateClientSide = useCallback((dir: 'prev' | 'next') => {
    const m   = calRef.current;
    const vp0 = visibleParsed();
    if (!vp0) return;

    const oldItems = filterCalItemsByRange(m.bulkItems ?? [], vp0.start, vp0.end);
    const oldHtml  = buildCalendarGridHtml(oldItems, vp0, viewMetaForRender());

    if (viewModeRef.current === 'week' && weekParamsRef.current) {
      const np = dir === 'prev' ? prevWeekRange(weekParamsRef.current) : nextWeekRange(weekParamsRef.current);
      setWeekParams(np); weekParamsRef.current = np;
      const mr = isoToMonthRef(np.start);
      setMonthRef(mr);   monthRefRef.current   = mr;
    } else if (viewModeRef.current === 'month' && monthRefRef.current) {
      const nr = shiftMonthRef(monthRefRef.current, dir === 'prev' ? -1 : 1);
      setMonthRef(nr); monthRefRef.current = nr;
    } else return;

    const vp1      = visibleParsed();
    if (!vp1) return;
    const newItems = filterCalItemsByRange(m.bulkItems ?? [], vp1.start, vp1.end);
    const newHtml  = buildCalendarGridHtml(newItems, vp1, viewMetaForRender());

    m.lastItems  = newItems;
    m.lastParsed = vp1;

    if (viewModeRef.current === 'week') setTitle(formatWeekTitle(vp1.start, vp1.end));
    else if (monthRefRef.current) setTitle(formatMonthTitle(monthRefRef.current));

    const { hideWhenEmpty: he, getForceVisible: gf } = propsRef.current;
    if (he && newItems.length === 0 && !gf()) { setPanelVisible(false); return; }
    setPanelVisible(true);

    skipDomSyncRef.current = true;
    setGridHtml(newHtml);
    m.swipeAnimating = true;
    clearCalBodyLoadingAttrs(calBodyRef.current);
    applyCalSwipe(calBodyRef.current, dir, oldHtml, newHtml, () => {
      m.swipeAnimating         = false;
      skipDomSyncRef.current = false;
    });
  }, [viewMetaForRender, visibleParsed]);

  // ── 公開: ナビゲーション ─────────────────────────────────────────────
  const navigate = useCallback((dir: 'prev' | 'next') => {
    const m = calRef.current;
    if (m.loading || m.bulkFetching || m.swipeAnimating) return;

    if (m.clientDataMode && m.bulkParsed) {
      // 境界に達したら次の年のデータを延長取得してから移動
      if (atNavBoundary(dir)) { queueBulkExtend(dir); return; }
      navigateClientSide(dir);
      return;
    }

    const uK = m.storedUKbn || weekParamsRef.current?.uKbn;
    if (viewModeRef.current === 'week' && weekParamsRef.current) {
      const np = dir === 'prev' ? prevWeekRange(weekParamsRef.current) : nextWeekRange(weekParamsRef.current);
      setWeekParams(np); weekParamsRef.current = np;
      fetchRange(np);
    } else if (viewModeRef.current === 'month' && monthRefRef.current && uK) {
      const nr    = shiftMonthRef(monthRefRef.current, dir === 'prev' ? -1 : 1);
      setMonthRef(nr); monthRefRef.current = nr;
      fetchRange({ uKbn: uK, ...sixWeekRange(nr.y, nr.m) });
    }
  }, [atNavBoundary, fetchRange, navigateClientSide, queueBulkExtend]);

  // ── 公開: モード切替 ─────────────────────────────────────────────────
  const switchMode = useCallback((mode: 'week' | 'month') => {
    const m = calRef.current;
    if (m.loading || m.bulkFetching || m.swipeAnimating) return;
    if (mode === viewModeRef.current) return;

    const uK = m.storedUKbn || weekParamsRef.current?.uKbn;
    if (mode === 'month' && (!monthRefRef.current || !uK)) return;
    if (mode === 'week'  && !weekParamsRef.current) return;

    setViewMode(mode); viewModeRef.current = mode;

    if (m.clientDataMode && m.bulkParsed) {
      if (mode === 'month' && !monthRefRef.current && weekParamsRef.current) {
        const nr = isoToMonthRef(weekParamsRef.current.start);
        setMonthRef(nr); monthRefRef.current = nr;
      }
      redrawFromClient({ enterAnim: true });
      return;
    }

    // フェッチ経由の場合、レスポンス受信後にフェードインが走るようフラグを立てる
    m.pendingEnterAnim = true;
    if (mode === 'month' && monthRefRef.current && uK) {
      fetchRange({ uKbn: uK, ...sixWeekRange(monthRefRef.current.y, monthRefRef.current.m) }, { lockBodyHeight: true });
    } else if (mode === 'week' && weekParamsRef.current) {
      fetchRange(weekParamsRef.current, { lockBodyHeight: true });
    }
  }, [fetchRange, redrawFromClient]);

  // ── King LMS リンク/コース設定変更 → 再描画 ──────────────────────────
  useEffect(() => {
    if (kogiDisplayDeps === undefined) return;
    const m = calRef.current;
    if (m.lastParsed === null) return;
    if (m.clientDataMode && m.bulkParsed) redrawFromClient({ enterAnim: false });
    else redraw(m.lastItems, m.lastParsed, { enterAnim: false });
  }, [kogiDisplayDeps, redraw, redrawFromClient]);

  // ── 強制表示設定変更 → 可視性更新 ────────────────────────────────────
  useEffect(() => {
    if (forceVisibleDeps === undefined) return;
    const m = calRef.current;
    const { hideWhenEmpty: he, getForceVisible: gf } = propsRef.current;
    if (he && !m.clientDataMode && m.lastParsed === null) { setPanelVisible(!!gf()); return; }
    if (m.clientDataMode && m.bulkParsed) redrawFromClient({ enterAnim: false });
    else if (m.lastParsed) redraw(m.lastItems, m.lastParsed, { enterAnim: false });
  }, [forceVisibleDeps, redraw, redrawFromClient]);

  // ── 返却値 ───────────────────────────────────────────────────────────
  const modeTitle      = viewMode === 'week' ? titles.week : titles.month;
  const modeGroupLabel = `${titles.week.replace(/^今週の/, '')}カレンダー表示切替`;

  return { calBodyRef, panelVisible, viewMode, calKind, modeTitle, modeGroupLabel, title, switchMode, navigate };
}
