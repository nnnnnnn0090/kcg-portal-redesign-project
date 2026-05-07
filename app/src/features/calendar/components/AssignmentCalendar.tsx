/**
 * 拡張ストレージに保存された King LMS 課題をカレンダー表示するパネルです。
 * データが無い場合も枠と「最新の状態に更新」導線は常に表示します（`hideWhenEmpty` は行いません）。
 */

import { useState, useLayoutEffect, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  toIsoLocal,
  sixWeekRange,
  isoToMonthRef,
  shiftMonthRef,
  prevWeekRange,
  nextWeekRange,
  filterCalItemsByRange,
  calendarRealignAnchorIso,
} from '../../../lib/date';
import { useSettings } from '../../../context/settings';
import { buildCalendarGridHtml } from '../grid';
import { SK, KING_LMS_ASSIGNMENT_SYNC_URL } from '../../../shared/constants';
import storage from '../../../lib/storage';
import {
  clearCalBodyLoadingAttrs,
  applyCalSwipe,
  setCalBodyHtmlSmooth,
  prefersReducedMotion,
} from '../anim';
import {
  assignmentViewMeta,
  dueItemsToCalEvents,
  formatKingLmsCapturedAgoJa,
  weekRangeContaining,
  type DuePayload,
} from '../assignment';
import { CalendarShell } from './CalendarShell';

// ─── 型 ───────────────────────────────────────────────────────────────────

interface AssignmentCalendarProps {
  payload: DuePayload | null;
  titles:  { week: string; month: string };
}

// ─── コンポーネント ────────────────────────────────────────────────────────

export function AssignmentCalendar({ payload, titles }: AssignmentCalendarProps) {
  const todayIso = toIsoLocal(new Date());
  const { settings, settingsReady } = useSettings();
  const weekStart = settings.calendarWeekStart;
  const events   = useMemo(() => dueItemsToCalEvents(payload?.items ?? []), [payload?.items]);
  const hasData  = events.length > 0;

  const [viewMode,       setViewMode]       = useState<'week' | 'month'>('week');
  const [weekParams,     setWeekParams]     = useState(() => weekRangeContaining(todayIso));
  const [monthRef,       setMonthRef]       = useState(() => isoToMonthRef(todayIso));
  const [swipeAnimating, setSwipeAnimating] = useState(false);
  /** King LMS 同期ページへ遷移する直前の storage 書き込み中 */
  const [refreshNavigating, setRefreshNavigating] = useState(false);

  const calBodyRef    = useRef<HTMLDivElement>(null);
  /** 取得時刻の「◯秒前」を1秒ごとに更新 */
  const [capturedNowMs, setCapturedNowMs] = useState(() => Date.now());
  // スワイプ中は useLayoutEffect による DOM 更新をスキップする
  const skipDomSyncRef = useRef(false);
  /** 週/月切替直後の1回だけグリッドにフェードイン（授業カレンダーと同じ playCalModeEnterAnim） */
  const pendingModeEnterAnimRef = useRef(false);

  const weekParamsRef = useRef(weekParams);
  weekParamsRef.current = weekParams;
  const prevWeekStartRef = useRef<typeof weekStart | null>(null);

  useEffect(() => {
    if (!settingsReady) return;
    const today = toIsoLocal(new Date());
    const wp    = weekParamsRef.current;

    if (prevWeekStartRef.current === null) {
      prevWeekStartRef.current = weekStart;
      const wr = weekRangeContaining(today, weekStart);
      setWeekParams(wr);
      setMonthRef(isoToMonthRef(wr.start));
      return;
    }
    if (prevWeekStartRef.current === weekStart) return;
    prevWeekStartRef.current = weekStart;

    const anchor = calendarRealignAnchorIso(today, wp);
    const wr       = weekRangeContaining(anchor, weekStart);
    setWeekParams(wr);
    setMonthRef(isoToMonthRef(wr.start));
  }, [settingsReady, weekStart]);

  // ── 現在表示範囲の HTML を生成する ────────────────────────────────────
  const gridHtml = useMemo(() => {
    if (!hasData) return '';
    const r = viewMode === 'month'
      ? sixWeekRange(monthRef.y, monthRef.m, weekStart)
      : { start: weekParams.start, end: weekParams.end };
    return buildCalendarGridHtml(
      filterCalItemsByRange(events, r.start, r.end),
      r,
      { mode: viewMode, monthRef: viewMode === 'month' ? monthRef : null, ...assignmentViewMeta, weekStart },
    );
  }, [hasData, events, viewMode, monthRef, weekParams, weekStart]);

  // ── グリッド HTML を DOM に反映（スワイプ中は skip） ──────────────────
  useLayoutEffect(() => {
    if (!hasData) return;
    const el = calBodyRef.current;
    if (!el || skipDomSyncRef.current) return;
    clearCalBodyLoadingAttrs(el);
    const playEnter = pendingModeEnterAnimRef.current;
    pendingModeEnterAnimRef.current = false;
    setCalBodyHtmlSmooth(el, gridHtml, undefined, { playEnterAnim: playEnter });
  }, [gridHtml, hasData]);

  // ── 保存データ取得時刻の相対表示をリアルタイム更新 ─────────────────────
  useEffect(() => {
    if (!hasData) return;
    if (payload?.capturedAt == null || !Number.isFinite(payload.capturedAt)) return;
    setCapturedNowMs(Date.now());
    const id = window.setInterval(() => setCapturedNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasData, payload?.capturedAt]);

  // ── King LMS 課題データの再取得（同期ページへ遷移）──────────────────
  async function handleRefresh() {
    if (refreshNavigating) return;
    setRefreshNavigating(true);
    try {
      await storage.set({
        [SK.kingLmsAssignmentSyncPending]:    true,
        [SK.kingLmsAssignmentSyncReturnUrl]:  location.href,
      });
      window.location.href = KING_LMS_ASSIGNMENT_SYNC_URL;
    } catch {
      setRefreshNavigating(false);
    }
  }

  // ── 前/次 ナビゲーション ─────────────────────────────────────────────
  const navigate = useCallback((dir: 'prev' | 'next') => {
    if (swipeAnimating || !hasData) return;
    const el = calBodyRef.current;
    if (!el) return;

    // 現在の HTML（スワイプアウト用）
    const r0 = viewMode === 'month'
      ? sixWeekRange(monthRef.y, monthRef.m, weekStart)
      : { start: weekParams.start, end: weekParams.end };
    const oldHtml = buildCalendarGridHtml(
      filterCalItemsByRange(events, r0.start, r0.end),
      r0,
      { mode: viewMode, monthRef: viewMode === 'month' ? monthRef : null, ...assignmentViewMeta, weekStart },
    );

    // 次の表示範囲を計算してステートを更新
    let nextWp = weekParams;
    let nextMr = monthRef;
    if (viewMode === 'week') {
      nextWp = dir === 'prev' ? prevWeekRange(weekParams) : nextWeekRange(weekParams);
      nextMr = isoToMonthRef(nextWp.start);
      setWeekParams(nextWp);
      setMonthRef(nextMr);
    } else {
      nextMr = shiftMonthRef(monthRef, dir === 'prev' ? -1 : 1);
      setMonthRef(nextMr);
    }

    // 次の HTML（スワイプイン用）
    const r1 = viewMode === 'month'
      ? sixWeekRange(nextMr.y, nextMr.m, weekStart)
      : { start: nextWp.start, end: nextWp.end };
    const newHtml = buildCalendarGridHtml(
      filterCalItemsByRange(events, r1.start, r1.end),
      r1,
      { mode: viewMode, monthRef: viewMode === 'month' ? nextMr : null, ...assignmentViewMeta, weekStart },
    );

    if (prefersReducedMotion()) {
      clearCalBodyLoadingAttrs(el);
      return;
    }

    skipDomSyncRef.current = true;
    setSwipeAnimating(true);
    clearCalBodyLoadingAttrs(el);
    applyCalSwipe(el, dir, oldHtml, newHtml, () => {
      setSwipeAnimating(false);
      skipDomSyncRef.current = false;
    });
  }, [swipeAnimating, hasData, viewMode, weekParams, monthRef, events, weekStart]);

  // ── 週/月 モード切替 ─────────────────────────────────────────────────
  function switchMode(mode: 'week' | 'month') {
    if (!hasData || mode === viewMode || swipeAnimating) return;
    pendingModeEnterAnimRef.current = true;
    setViewMode(mode);
    const el = calBodyRef.current;
    if (el) {
      el.dataset.calMode = mode;
      // モード切替前の高さを保持してレイアウトシフトを緩和する
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 64) el.style.minHeight = `${h}px`;
      requestAnimationFrame(() => { el.style.minHeight = ''; });
    }
  }

  // ── ラベル ────────────────────────────────────────────────────────────
  const rangeLabel = viewMode === 'week'
    ? `${weekParams.start.replace(/-/g, '/')} 〜 ${weekParams.end.replace(/-/g, '/')}`
    : `${monthRef.y}年${monthRef.m + 1}月`;

  const capturedAgo = useMemo(() => {
    if (payload?.capturedAt == null || !Number.isFinite(payload.capturedAt)) return null;
    return formatKingLmsCapturedAgoJa(payload.capturedAt, capturedNowMs);
  }, [payload?.capturedAt, capturedNowMs]);

  return (
    <section
      id="p-assignment-calendar-panel"
      className={`p-panel p-panel-cal p-panel-cal-assignment${viewMode === 'month' ? ' is-month' : ''}`}
      data-cal-kind="assignment"
    >
      {/* ヘッダー行：タイトル + 再取得ボタン */}
      <div className="p-assignment-head-row">
        <span className="p-panel-head">課題カレンダー</span>
        <button
          type="button"
          id="p-assignment-refresh-btn"
          className={`p-settings-resync-btn${refreshNavigating ? ' is-busy' : ''}`}
          disabled={refreshNavigating}
          aria-busy={refreshNavigating}
          aria-label={
            refreshNavigating
              ? '課題データを取り込むため King LMS のページへ移動する準備中'
              : '課題の最新データを King LMS から取り込み（別ページへ移動）'
          }
          onClick={() => void handleRefresh()}
        >
          {refreshNavigating ? (
            <>
              <span className="p-assignment-refresh-spinner" aria-hidden />
              <span className="p-assignment-refresh-label">準備中…</span>
            </>
          ) : (
            <span className="p-assignment-refresh-label">最新の状態に更新</span>
          )}
        </button>
      </div>

      {refreshNavigating ? (
        <div className="p-assignment-refresh-status" role="status" aria-live="polite">
          <span className="p-assignment-refresh-status__spinner" aria-hidden />
          <div className="p-assignment-refresh-status__copy">
            <p className="p-assignment-refresh-status__lead">
              課題の最新データを取りに、<strong>King LMS</strong> の画面へ移動します。
            </p>
            <p className="p-assignment-refresh-status__hint">
              このままお待ちください。まもなくページが切り替わります（数秒かかることがあります）。
            </p>
          </div>
        </div>
      ) : null}

      {/* データ未取得メッセージ */}
      <div className="p-panel-body p-assignment-fetch-wrap" hidden={hasData}>
        <p className="p-empty">
          保存された課題はまだありません。「最新の状態に更新」で King LMS から取り込めます。
        </p>
      </div>

      {/* キャッシュ注意＋提出状況（Beta）の注記 */}
      <div className="p-assignment-cache-note" hidden={!hasData} role="note">
        <p>
          表示は{capturedAgo != null ? ` ${capturedAgo} ` : ' '}King LMS から取得した内容の保存データです。最新の状態でない可能性があります。「最新の状態に更新」で更新できます。
        </p>
        <p className="p-assignment-cache-note__beta">
          提出済み・未提出の表示はベータ版の推定です。取得データや判定の都合で実際と異なる場合があります。確実な確認は King LMS で行ってください。
        </p>
      </div>

      <CalendarShell
        viewMode={viewMode}
        modeTitle={viewMode === 'week' ? titles.week : titles.month}
        modeGroupLabel="課題カレンダー表示切替"
        rangeLabel={rangeLabel}
        switchMode={switchMode}
        navigate={navigate}
        calBodyRef={calBodyRef}
        bodyHidden={!hasData}
        navDisabled={!hasData || swipeAnimating}
        controlsDisabled={!hasData || swipeAnimating}
      />
    </section>
  );
}
