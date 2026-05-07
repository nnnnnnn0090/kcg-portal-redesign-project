/**
 * カレンダーのツールチップ・コンテキストメニュー用の空要素。
 * `useCalendarInteractions` が ref 経由で位置づけする。`#portal-overlay` 内の末尾付近に置く。
 */

import { useCalendarOverlayUiRefs } from '../../context/calendarOverlayUi';

export function CalendarOverlayAnchors() {
  const { hoverPopRef, ctxMenuRef, btnSylRef, btnKingRef } = useCalendarOverlayUiRefs();

  return (
    <>
      <div
        ref={hoverPopRef}
        id="p-cal-hover-pop"
        className="p-cal-hover-pop"
        hidden
        role="tooltip"
      />

      <div
        ref={ctxMenuRef}
        id="p-cal-ctx-menu"
        className="p-cal-ctx-menu"
        hidden
        role="menu"
        aria-label="講義リンク先"
      >
        <button
          type="button"
          ref={btnSylRef}
          id="p-cal-ctx-syllabus"
          className="p-cal-ctx-item"
          role="menuitem"
        >
          シラバスを開く
        </button>
        <button
          type="button"
          ref={btnKingRef}
          id="p-cal-ctx-kinglms"
          className="p-cal-ctx-item"
          role="menuitem"
        >
          King LMS を開く
        </button>
      </div>
    </>
  );
}
