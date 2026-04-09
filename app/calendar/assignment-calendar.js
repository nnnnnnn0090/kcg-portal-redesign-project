/**
 * calendar/assignment-calendar.js — King LMS streams/ultra 由来の課題カレンダー
 *
 * ロード順: document_idle（calendar/controller.js の後）。
 *
 * P.kingLmsStreamsUltraDue（storage 同期済み）の items を週/月グリッドに表示する。
 * 各セルは King LMS コースアウトラインへのリンクを持つ。
 *
 * 公開: P.createAssignmentCalendarController(config)
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  const LMS_ORIGIN = 'https://king-lms.kcg.edu';

  /**
   * iso 日を含む週の月曜始まり { start, end }（end は排他的）を返す。
   * @param {string} iso - YYYY-MM-DD
   * @returns {{ uKbn: string, start: string, end: string }}
   */
  function weekRangeStartingMondayContaining(iso) {
    const d = P.parseIsoLocal(iso);
    const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
    const start = P.toIsoLocal(mon);
    return { uKbn: '0', start, end: P.addDaysIso(start, 7) };
  }

  /**
   * @param {string} iso
   * @returns {string}
   */
  function formatDueLabel(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return String(iso);
    }
  }

  /**
   * @param {unknown[]} raw
   * @returns {object[]}
   */
  function rawItemsToCalEvents(raw) {
    const arr = Array.isArray(raw) ? raw : [];
    const out = [];
    const seen = new Set();
    for (const row of arr) {
      if (!row || typeof row !== 'object') continue;
      if (row.dueDate == null || String(row.dueDate).trim() === '') continue;
      const start = String(row.dueDate).trim();
      const title = String(row.title || '').trim() || '（無題）';
      const courseName = String(row.courseName || '').trim();
      const cid = String(row.courseId || '').trim();
      const dk = P.calEventDayIso({ start });
      const dedup = `${dk}\0${start}\0${title}\0${cid}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      const tip = [
        courseName && `コース: ${courseName}`,
        `期限: ${formatDueLabel(start)}`,
      ].filter(Boolean).join('\n');
      const href = cid
        ? `${LMS_ORIGIN}/ultra/courses/${encodeURIComponent(cid)}/outline`
        : '';
      out.push({
        start,
        title,
        tooltip: tip,
        calMeta: courseName,
        calTime: formatDueLabel(start),
        href,
      });
    }
    out.sort((a, b) => String(a.start).localeCompare(String(b.start)));
    return out;
  }

  /**
   * @param {{
   *   titles: { week: string, month: string },
   *   getDuePayload: () => { items?: unknown[] } | null | undefined,
   *   els: {
   *     panel: Element | null,
   *     body: Element | null,
   *     title: Element | null,
   *     range: Element | null,
   *     prev: HTMLButtonElement | null,
   *     next: HTMLButtonElement | null,
   *     modeWeek: HTMLButtonElement | null,
   *     modeMonth: HTMLButtonElement | null,
   *     toolbar: Element | null,
   *     calScroll: Element | null,
   *     fetchWrap: Element | null,
   *     cacheNote: Element | null,
   *   }
   * }} config
   */
  function createAssignmentCalendarController(config) {
    const { titles, els, getDuePayload } = config;

    let viewMode = 'week';
    let weekParams = null;
    let monthRef = null;
    let swipeAnimating = false;

    function allEvents() {
      const p = getDuePayload && getDuePayload();
      const items = (p && typeof p === 'object' && Array.isArray(p.items)) ? p.items : [];
      return rawItemsToCalEvents(items);
    }

    function visibleParsed() {
      if (viewMode === 'month' && monthRef) {
        return { uKbn: '0', ...P.sixWeekRange(monthRef.y, monthRef.m) };
      }
      if (weekParams) return weekParams;
      return null;
    }

    function viewMeta() {
      return {
        mode:           viewMode,
        monthRef,
        calLinkKingLms: false,
        kingLmsCourses: [],
        calKind:        'assignment',
      };
    }

    function setNavEnabled() {
      const busy  = swipeAnimating;
      const ready = !busy && ((viewMode === 'week' && weekParams) || (viewMode === 'month' && monthRef));
      if (els.prev) els.prev.disabled = !ready;
      if (els.next) els.next.disabled = !ready;
    }

    function setModeUI() {
      els.modeWeek?.classList.toggle('is-active', viewMode === 'week');
      els.modeMonth?.classList.toggle('is-active', viewMode === 'month');
      if (els.title) els.title.textContent = viewMode === 'month' ? titles.month : titles.week;
      els.panel?.classList.toggle('is-month', viewMode === 'month');
    }

    function setRangeLabel() {
      if (!els.range) return;
      if (viewMode === 'month' && monthRef) {
        els.range.textContent = `${monthRef.y}年${monthRef.m + 1}月`;
      } else if (weekParams) {
        els.range.textContent = `${weekParams.start.replace(/-/g, '/')} 〜 ${weekParams.end.replace(/-/g, '/')}`;
      } else {
        els.range.textContent = '';
      }
    }

    function applyBody(html) {
      P.anim.setCalBodyHtmlSmooth(els.body, html, () => {});
      setNavEnabled();
    }

    function hasData() {
      return allEvents().length > 0;
    }

    function syncViewMode() {
      const show = hasData();
      if (els.fetchWrap) els.fetchWrap.hidden = show;
      if (els.toolbar) els.toolbar.hidden = !show;
      if (els.calScroll) els.calScroll.hidden = !show;
      if (els.cacheNote) els.cacheNote.hidden = !show;
    }

    function redraw() {
      syncViewMode();
      const vp = visibleParsed();
      if (!vp || !els.body) return;
      if (!hasData()) {
        P.clearCalBodyLoadingAttrs(els.body);
        setNavEnabled();
        return;
      }

      const filtered = P.filterCalItemsByRange(allEvents(), vp.start, vp.end);
      setRangeLabel();
      const gridHtml = P.buildCalendarGridHtml(filtered, vp, viewMeta());
      P.clearCalBodyLoadingAttrs(els.body);
      applyBody(gridHtml);
    }

    function navigate(dir) {
      if (swipeAnimating) return;
      const meta0 = viewMeta();
      const vp0   = visibleParsed();
      if (!vp0) return;

      const oldHtml = P.buildCalendarGridHtml(
        P.filterCalItemsByRange(allEvents(), vp0.start, vp0.end),
        vp0,
        meta0,
      );

      if (viewMode === 'week' && weekParams) {
        weekParams = dir === 'prev' ? P.prevWeekRange(weekParams) : P.nextWeekRange(weekParams);
        monthRef = P.isoToMonthRef(weekParams.start);
      } else if (viewMode === 'month' && monthRef) {
        monthRef = P.shiftMonthRef(monthRef, dir === 'prev' ? -1 : 1);
      } else {
        return;
      }

      const vp1 = visibleParsed();
      if (!vp1) return;
      const newItems = P.filterCalItemsByRange(allEvents(), vp1.start, vp1.end);
      const newHtml  = P.buildCalendarGridHtml(newItems, vp1, viewMeta());

      setRangeLabel();

      syncViewMode();

      if (P.anim.prefersReducedMotion()) {
        P.clearCalBodyLoadingAttrs(els.body);
        applyBody(newHtml);
        return;
      }

      swipeAnimating = true;
      setNavEnabled();
      P.clearCalBodyLoadingAttrs(els.body);
      P.anim.applyCalSwipe(els.body, dir, oldHtml, newHtml, () => {
        swipeAnimating = false;
        setNavEnabled();
      });
    }

    function switchMode(mode) {
      if (mode === viewMode || swipeAnimating) return;
      if (mode === 'month' && !monthRef && weekParams) monthRef = P.isoToMonthRef(weekParams.start);
      if (mode === 'week' && !weekParams) return;
      if (mode === 'month' && !monthRef) return;

      viewMode = mode;
      setModeUI();
      if (els.body) {
        els.body.dataset.calMode = viewMode;
        const h = Math.round(els.body.getBoundingClientRect().height);
        if (h > 64) els.body.style.minHeight = `${h}px`;
      }
      redraw();
      if (els.body) els.body.style.minHeight = '';
    }

    function wireNav() {
      els.prev?.addEventListener('click', () => navigate('prev'));
      els.next?.addEventListener('click', () => navigate('next'));
      els.modeWeek?.addEventListener('click',  () => switchMode('week'));
      els.modeMonth?.addEventListener('click', () => switchMode('month'));
    }

    function init() {
      const today = P.toIsoLocal(new Date());
      weekParams = weekRangeStartingMondayContaining(today);
      monthRef   = P.isoToMonthRef(weekParams.start);
      viewMode   = 'week';
      setModeUI();
      setRangeLabel();
      redraw();
    }

    function refreshFromStorage() {
      redraw();
    }

    return { wireNav, init, refreshFromStorage };
  }

  P.createAssignmentCalendarController = createAssignmentCalendarController;

})(typeof globalThis !== 'undefined' ? globalThis : window);
