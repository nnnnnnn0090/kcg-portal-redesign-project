import type { TourStep } from './types';

export const STEPS: TourStep[] = [
  { kind: 'welcome', id: 'welcome' },
  { kind: 'theme', id: 'theme' },
  { kind: 'weekStart', id: 'week-start' },
  { kind: 'character', id: 'character' },
  {
    kind: 'spotlight',
    id: 'kogi',
    selector: '.p-panel-cal-wrap:has(section.p-panel-cal[data-cal-kind="kogi"])',
    selectorFallback: 'section.p-panel-cal[data-cal-kind="kogi"]',
  },
  {
    kind: 'spotlight',
    id: 'calendar-mode',
    selector: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-mode',
    selectorFallback: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-toolbar',
  },
  {
    kind: 'spotlight',
    id: 'kogi-hover',
    selector: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-ev[data-cal-kind="kogi"]',
    selectorFallback: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-body',
  },
  {
    kind: 'spotlight',
    id: 'kogi-context',
    selector: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-ev[data-cal-kind="kogi"]',
    selectorFallback: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-body',
  },
  {
    kind: 'spotlight',
    id: 'assignment-overview',
    selector: '#p-assignment-calendar-panel',
  },
  {
    kind: 'spotlight',
    id: 'assignment',
    selector: '#p-assignment-refresh-btn',
    selectorFallback: '#p-assignment-calendar-panel',
  },
  {
    kind: 'spotlight',
    id: 'shortcuts',
    selector: 'section.p-panel.p-panel-links',
    selectorFallback: '#p-links',
  },
  {
    kind: 'spotlight',
    id: 'attendance',
    selector: '#p-shortcut-attendance',
    selectorFallback: '#p-link-edit-btn',
  },
  {
    kind: 'spotlight',
    id: 'webmail',
    selector: '#p-shortcut-webmail',
    selectorFallback: '#p-link-edit-btn',
  },
  { kind: 'done', id: 'done' },
];

export const PROGRESS_WIDTH_CLASS: Record<string, string> = {
  '1/12': 'tw-w-tour-progress-1-12',
  '2/12': 'tw-w-tour-progress-2-12',
  '3/12': 'tw-w-tour-progress-3-12',
  '4/12': 'tw-w-tour-progress-4-12',
  '5/12': 'tw-w-tour-progress-5-12',
  '6/12': 'tw-w-tour-progress-6-12',
  '7/12': 'tw-w-tour-progress-7-12',
  '8/12': 'tw-w-tour-progress-8-12',
  '9/12': 'tw-w-tour-progress-9-12',
  '10/12': 'tw-w-tour-progress-10-12',
  '11/12': 'tw-w-tour-progress-11-12',
  '12/12': 'tw-w-full',
  '1/14': 'tw-w-tour-progress-1-14',
  '2/14': 'tw-w-tour-progress-2-14',
  '3/14': 'tw-w-tour-progress-3-14',
  '4/14': 'tw-w-tour-progress-4-14',
  '5/14': 'tw-w-tour-progress-5-14',
  '6/14': 'tw-w-tour-progress-6-14',
  '7/14': 'tw-w-tour-progress-7-14',
  '8/14': 'tw-w-tour-progress-8-14',
  '9/14': 'tw-w-tour-progress-9-14',
  '10/14': 'tw-w-tour-progress-10-14',
  '11/14': 'tw-w-tour-progress-11-14',
  '12/14': 'tw-w-tour-progress-12-14',
  '13/14': 'tw-w-tour-progress-13-14',
  '14/14': 'tw-w-full',
};

export const RECOMMENDED_THEME_KEYS = ['dark', 'light', 'tokyoNight', 'cherryBlossom'] as const;

export const mascotIllustratorName = import.meta.env.VITE_MASCOT_ILLUSTRATOR_NAME?.trim() ?? '';
export const mascotIllustratorUrl = import.meta.env.VITE_MASCOT_ILLUSTRATOR_URL?.trim() ?? '';

export const ASSIGNMENT_STEP_IDS = new Set(['assignment-overview', 'assignment']);
export const CALENDAR_OVERVIEW_STEP_IDS = new Set(['kogi', 'assignment-overview']);

export const HOLE_PAD = 10;
export const MIN_SPOTLIGHT_EL_PX = 2;
export const SCROLL_SETTLE_MS = 420;
export const HOLE_RETRY_MS = 100;
export const HOLE_RETRY_MAX = 15;
export const DOCK_EXIT_MS = 180;
export const FINISH_WAIT_MS = 2000;
export const FINISH_FADE_MS = 360;
