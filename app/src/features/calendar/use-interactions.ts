/**
 * カレンダーイベントのツールチップとコンテキストメニューを管理するカスタムフック。
 * #portal-overlay への委譲イベントリスナーとして動作する。
 * tooltip / メニュー DOM は CalendarOverlayUiProvider の ref を使う。
 */

import { useEffect, useRef, type RefObject } from 'react';
import { esc, setHtml } from '../../lib/dom';
import { beginKingLmsCourseListSync } from '../../lib/king-lms-course-sync';
import { formatRemainingUntilDue } from './assignment';
import { syllabusUrl, findKingLmsUrl } from './kogi';
import { useCourses, type CourseRow } from '../../context/courses';
import { useCalendarOverlayUiRefs } from '../../context/calendarOverlayUi';
import { usePortalDom } from '../../context/portalDom';

function attachCalendarTooltipAndContextMenu(
  overlayRoot: HTMLElement,
  hoverPopEl: HTMLElement,
  menuEl: HTMLDivElement,
  btnSyl: HTMLButtonElement,
  btnKing: HTMLButtonElement,
  coursesRef: RefObject<CourseRow[]>,
  settingsPopRef: RefObject<HTMLDivElement | null>,
): () => void {
  let hideTimer = 0;

  function hide() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
    hoverPopEl.hidden = true;
    hoverPopEl.replaceChildren();
  }

  function positionHover(anchor: Element) {
    const r   = anchor.getBoundingClientRect();
    const pad = 10;
    const pw  = hoverPopEl.offsetWidth;
    const ph  = hoverPopEl.offsetHeight;
    // アンカー中央の真下に配置し、画面端からはみ出ないよう左右をクランプ
    const left = Math.max(pad, Math.min(r.left + r.width / 2 - pw / 2, window.innerWidth - pw - pad));
    let top    = r.bottom + pad;
    // 下端を超える場合はアンカー上側に反転（フリップ）
    if (top + ph > window.innerHeight - pad) top = r.top - ph - pad;
    hoverPopEl.style.left = `${left}px`;
    hoverPopEl.style.top  = `${Math.max(pad, top)}px`;
  }

  function showTooltip(anchor: Element) {
    if (!(anchor instanceof HTMLElement)) return;
    const title = anchor.dataset.calTitle || '';
    const meta  = anchor.dataset.calMeta  || '';
    const tip   = (anchor.dataset.calTip  || '').trim();
    const time  = (anchor.dataset.calTime || '').trim();
    if (!title && !meta && !tip && !time) return;

    const parts = [`<div class="p-cal-pop-title">${esc(title || '（無題）')}</div>`];
    if (time) {
      const dueIso = (anchor.dataset.calDueIso || '').trim();
      const remain = dueIso ? formatRemainingUntilDue(dueIso) : null;
      const remainHtml = remain
        ? `<span class="p-cal-pop-remain">${esc(remain)}</span>`
        : '';
      parts.push(`<div class="p-cal-pop-time">${esc(time)}${remainHtml}</div>`);
    }
    if (meta) parts.push(`<div class="p-cal-pop-meta">${esc(meta)}</div>`);
    if (tip && tip !== title.trim()) {
      const lines = tip.split('\n').map((l) => l.trimEnd()).filter(Boolean);
      const third = lines[2] || '';
      if (third) parts.push(`<div class="p-cal-pop-detail"><div class="p-cal-pop-dline">${esc(third)}</div></div>`);
    }
    setHtml(hoverPopEl, parts.join(''));
    hoverPopEl.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => positionHover(anchor)));
  }

  function onMouseOver(e: MouseEvent) {
    const hit = e.target instanceof Element ? e.target.closest('.p-cal-ev') : null;
    if (!hit || !overlayRoot.contains(hit)) return;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
    showTooltip(hit);
  }

  function onMouseOut(e: MouseEvent) {
    const rel = e.relatedTarget;
    if (rel instanceof Node && overlayRoot.contains(rel)) {
      const next = rel instanceof Element ? rel.closest('.p-cal-ev') : null;
      if (next) { if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; } showTooltip(next); return; }
    }
    hideTimer = window.setTimeout(hide, 60);
  }

  function onKogiPrimaryClick(e: MouseEvent) {
    if (e.button !== 0) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    const ev = t.closest('.p-cal-ev[data-cal-kind="kogi"]');
    if (!ev || !overlayRoot.contains(ev)) return;
    if (ev instanceof HTMLAnchorElement) return;
    e.preventDefault();
    e.stopPropagation();
    void beginKingLmsCourseListSync();
  }

  overlayRoot.addEventListener('click', onKogiPrimaryClick);
  overlayRoot.addEventListener('mouseover', onMouseOver);
  overlayRoot.addEventListener('mouseout',  onMouseOut);
  overlayRoot.addEventListener('scroll', hide, { passive: true, capture: true });
  window.addEventListener('scroll', hide, { passive: true, capture: true });

  let urlSyllabus = '';
  let urlKingLms  = '';

  function closeCtx() { menuEl.hidden = true; }

  function positionMenu(clientX: number, clientY: number) {
    const pad  = 8;
    // カーソル位置を起点に、画面四辺からはみ出ないようにクランプ
    const left = Math.max(pad, Math.min(clientX, window.innerWidth  - menuEl.offsetWidth  - pad));
    const top  = Math.max(pad, Math.min(clientY, window.innerHeight - menuEl.offsetHeight - pad));
    menuEl.style.left = `${left}px`;
    menuEl.style.top  = `${top}px`;
  }

  function onContextMenu(e: MouseEvent) {
    const ev = e.target instanceof Element ? e.target.closest('.p-cal-ev[data-cal-kind="kogi"]') : null;
    if (!ev || !overlayRoot.contains(ev)) return;
    e.preventDefault();
    e.stopPropagation();
    hide();

    const title    = (ev as HTMLElement).dataset.calTitle || '';
    const tipPlain = (ev as HTMLElement).dataset.calTip   || '';
    urlSyllabus = syllabusUrl('', tipPlain);
    urlKingLms  = findKingLmsUrl(coursesRef.current, title);

    btnSyl.disabled  = !urlSyllabus;
    btnKing.hidden   = !urlKingLms;
    btnKing.disabled = false;

    menuEl.hidden = false;
    positionMenu(e.clientX, e.clientY);
    requestAnimationFrame(() => requestAnimationFrame(() => positionMenu(e.clientX, e.clientY)));
  }

  function onMenuClick(e: MouseEvent) {
    const btn = e.target instanceof Element ? e.target.closest('button') : null;
    if (!btn || !menuEl.contains(btn)) return;
    if (btn === btnSyl  && urlSyllabus) window.open(urlSyllabus, '_blank', 'noopener,noreferrer');
    if (btn === btnKing && urlKingLms)  window.open(urlKingLms,  '_blank', 'noopener,noreferrer');
    closeCtx();
  }

  function onDocPointerDown(e: PointerEvent) {
    if (menuEl.hidden) return;
    if (menuEl.contains(e.target as Node)) return;
    closeCtx();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    const sp = settingsPopRef.current;
    if (sp && !sp.hidden) return;
    if (!menuEl.hidden) { closeCtx(); return; }
    hide();
  }

  overlayRoot.addEventListener('contextmenu', onContextMenu);
  menuEl.addEventListener('click', onMenuClick);
  document.addEventListener('pointerdown', onDocPointerDown, true);
  document.addEventListener('keydown', onKeyDown);

  return () => {
    overlayRoot.removeEventListener('click', onKogiPrimaryClick);
    overlayRoot.removeEventListener('mouseover', onMouseOver);
    overlayRoot.removeEventListener('mouseout',  onMouseOut);
    overlayRoot.removeEventListener('scroll', hide, { capture: true } as AddEventListenerOptions);
    window.removeEventListener('scroll', hide, { capture: true } as AddEventListenerOptions);
    overlayRoot.removeEventListener('contextmenu', onContextMenu);
    menuEl.removeEventListener('click', onMenuClick);
    document.removeEventListener('pointerdown', onDocPointerDown, true);
    document.removeEventListener('keydown', onKeyDown);
    hide();
    closeCtx();
  };
}

export function useCalendarInteractions(): void {
  const { courses } = useCourses();
  const coursesRef  = useRef(courses);
  coursesRef.current = courses;
  const { hoverPopRef, ctxMenuRef, btnSylRef, btnKingRef } = useCalendarOverlayUiRefs();
  const { overlayRoot, settingsPopRef } = usePortalDom();

  useEffect(() => {
    const hoverPopEl  = hoverPopRef.current;
    const menuEl      = ctxMenuRef.current;
    const btnSyl      = btnSylRef.current;
    const btnKing     = btnKingRef.current;
    if (hoverPopEl === null || menuEl === null || btnSyl === null || btnKing === null) {
      return;
    }
    return attachCalendarTooltipAndContextMenu(
      overlayRoot,
      hoverPopEl,
      menuEl,
      btnSyl,
      btnKing,
      coursesRef,
      settingsPopRef,
    );
  }, [hoverPopRef, ctxMenuRef, btnSylRef, btnKingRef, overlayRoot, settingsPopRef]);
}
