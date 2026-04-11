/**
 * King LMS 課題カレンダーコンポーネント。
 * 保存済み課題データをカレンダー形式で表示し、再取得トリガーを提供する。
 * データなしの状態でも常に表示する（授業カレンダーとは異なり hideWhenEmpty しない）。
 */

import { useState, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import {
  toIsoLocal,
  sixWeekRange,
  isoToMonthRef,
  shiftMonthRef,
  prevWeekRange,
  nextWeekRange,
  filterCalItemsByRange,
} from '../../../lib/date';
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
  const events   = useMemo(() => dueItemsToCalEvents(payload?.items ?? []), [payload?.items]);
  const hasData  = events.length > 0;

  const [viewMode,       setViewMode]       = useState<'week' | 'month'>('week');
  const [weekParams,     setWeekParams]     = useState(() => weekRangeContaining(todayIso));
  const [monthRef,       setMonthRef]       = useState(() => isoToMonthRef(todayIso));
  const [swipeAnimating, setSwipeAnimating] = useState(false);

  const calBodyRef    = useRef<HTMLDivElement>(null);
  // スワイプ中は useLayoutEffect による DOM 更新をスキップする
  const skipDomSyncRef = useRef(false);
  /** 週/月切替直後の1回だけグリッドにフェードイン（授業カレンダーと同じ playCalModeEnterAnim） */
  const pendingModeEnterAnimRef = useRef(false);

  // ── 現在表示範囲の HTML を生成する ────────────────────────────────────
  const gridHtml = useMemo(() => {
    if (!hasData) return '';
    const r = viewMode === 'month'
      ? sixWeekRange(monthRef.y, monthRef.m)
      : { start: weekParams.start, end: weekParams.end };
    return buildCalendarGridHtml(
      filterCalItemsByRange(events, r.start, r.end),
      r,
      { mode: viewMode, monthRef: viewMode === 'month' ? monthRef : null, ...assignmentViewMeta },
    );
  }, [hasData, events, viewMode, monthRef, weekParams]);

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

  // ── King LMS 課題データの再取得（同期ページへ遷移）──────────────────
  async function handleRefresh() {
    await storage.set({
      [SK.kingLmsAssignmentSyncPending]:    true,
      [SK.kingLmsAssignmentSyncReturnUrl]:  location.href,
    });
    window.location.href = KING_LMS_ASSIGNMENT_SYNC_URL;
  }

  // ── 前/次 ナビゲーション ─────────────────────────────────────────────
  const navigate = useCallback((dir: 'prev' | 'next') => {
    if (swipeAnimating || !hasData) return;
    const el = calBodyRef.current;
    if (!el) return;

    // 現在の HTML（スワイプアウト用）
    const r0 = viewMode === 'month'
      ? sixWeekRange(monthRef.y, monthRef.m)
      : { start: weekParams.start, end: weekParams.end };
    const oldHtml = buildCalendarGridHtml(
      filterCalItemsByRange(events, r0.start, r0.end),
      r0,
      { mode: viewMode, monthRef: viewMode === 'month' ? monthRef : null, ...assignmentViewMeta },
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
      ? sixWeekRange(nextMr.y, nextMr.m)
      : { start: nextWp.start, end: nextWp.end };
    const newHtml = buildCalendarGridHtml(
      filterCalItemsByRange(events, r1.start, r1.end),
      r1,
      { mode: viewMode, monthRef: viewMode === 'month' ? nextMr : null, ...assignmentViewMeta },
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
  }, [swipeAnimating, hasData, viewMode, weekParams, monthRef, events]);

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

  return (
    <section
      className={`p-panel p-panel-cal p-panel-cal-assignment${viewMode === 'month' ? ' is-month' : ''}`}
      data-cal-kind="assignment"
    >
      {/* ヘッダー行：タイトル + 再取得ボタン */}
      <div className="p-assignment-head-row">
        <span className="p-panel-head">課題カレンダー</span>
        <button
          type="button"
          id="p-assignment-refresh-btn"
          className="p-settings-resync-btn"
          onClick={() => void handleRefresh()}
        >
          最新の状態に更新
        </button>
      </div>

      {/* データ未取得メッセージ */}
      <div className="p-panel-body p-assignment-fetch-wrap" hidden={hasData}>
        <p className="p-empty">
          保存された課題はまだありません。「最新の状態に更新」で King LMS から取り込めます。
        </p>
      </div>

      {/* キャッシュ注意書き */}
      <p className="p-assignment-cache-note" hidden={!hasData} role="note">
        表示は King LMS から取得した内容の保存データです。最新の状態でない可能性があります。「最新の状態に更新」で更新できます。
      </p>

      <CalendarShell
        viewMode={viewMode}
        modeTitle={viewMode === 'week' ? titles.week : titles.month}
        modeGroupLabel="課題カレンダー表示切替"
        rangeLabel={rangeLabel}
        switchMode={switchMode}
        navigate={navigate}
        calBodyRef={calBodyRef}
        bodyHidden={!hasData}
        controlsDisabled={!hasData}
      />
    </section>
  );
}
