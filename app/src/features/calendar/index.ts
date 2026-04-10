/**
 * ポータルカレンダー機能の公開境界。
 * 授業カレンダーパネル・課題カレンダー・フック・型はここから import する。
 */

export { CalendarPanel } from './components/CalendarPanel';
export { AssignmentCalendar } from './components/AssignmentCalendar';
export { CalendarShell, type CalendarShellProps } from './components/CalendarShell';
export { useCalendarPanel, type CalendarPanelConfig } from './use-panel';
export { useCalendarInteractions } from './use-interactions';
export type { CalParams, CalEvent, ViewMeta } from './types';
export type { DuePayload, DueItem } from './assignment';
