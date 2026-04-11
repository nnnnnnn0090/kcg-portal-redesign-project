/**
 * カレンダー共通 UI シェル。
 * 週/月切替ツールバーとカレンダー本体の DOM マウント先を提供する。
 * CalendarPanel と AssignmentCalendar の両方から使用する。
 */

import type { RefObject } from 'react';

export interface CalendarShellProps {
  viewMode:       'week' | 'month';
  modeTitle:      string;
  modeGroupLabel: string;
  rangeLabel:     string;
  switchMode:     (mode: 'week' | 'month') => void;
  navigate:       (dir: 'prev' | 'next') => void;
  calBodyRef:     RefObject<HTMLDivElement | null>;
  toolbarHidden?: boolean;
  bodyHidden?:    boolean;
  navDisabled?:   boolean;
  /** true のとき週/月・前後ナビを無効化（課題未取り込みなど） */
  controlsDisabled?: boolean;
}

export function CalendarShell({
  viewMode,
  modeTitle,
  modeGroupLabel,
  rangeLabel,
  switchMode,
  navigate,
  calBodyRef,
  toolbarHidden     = false,
  bodyHidden        = false,
  navDisabled       = false,
  controlsDisabled  = false,
}: CalendarShellProps) {
  const navLocked = navDisabled || controlsDisabled;
  return (
    <>
      <div className="p-cal-toolbar" hidden={toolbarHidden}>
        <span className="p-cal-title">{modeTitle}</span>

        {/* 週 / 月 切替ボタン */}
        <div className="p-cal-mode" role="group" aria-label={modeGroupLabel}>
          <button
            type="button"
            className={`p-cal-mode-btn${viewMode === 'week' ? ' is-active' : ''}`}
            disabled={controlsDisabled}
            onClick={() => switchMode('week')}
          >
            週
          </button>
          <button
            type="button"
            className={`p-cal-mode-btn${viewMode === 'month' ? ' is-active' : ''}`}
            disabled={controlsDisabled}
            onClick={() => switchMode('month')}
          >
            月
          </button>
        </div>

        {/* 前後ナビゲーション */}
        <div className="p-cal-nav">
          <button
            type="button"
            className="p-cal-btn"
            aria-label="前へ"
            disabled={navLocked}
            onClick={() => navigate('prev')}
          >
            戻る
          </button>
          <span className="p-cal-range">{rangeLabel}</span>
          <button
            type="button"
            className="p-cal-btn"
            aria-label="次へ"
            disabled={navLocked}
            onClick={() => navigate('next')}
          >
            次へ
          </button>
        </div>
      </div>

      {/* カレンダーグリッドの描画先（innerHTML で注入される） */}
      <div className="p-panel-body p-cal-scroll" hidden={bodyHidden}>
        <div className="p-cal-body" ref={calBodyRef} data-cal-mode={viewMode} />
      </div>
    </>
  );
}
