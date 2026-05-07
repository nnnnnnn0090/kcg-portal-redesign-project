/**
 * 学ポータル上のカレンダー UI（授業・補修・キャンパス・課題）の公開境界です。
 * アプリ本体は本モジュールからコンポーネント・フック・型のみを import します。
 */

export { CalendarPanel } from './components/CalendarPanel';
export { AssignmentCalendar } from './components/AssignmentCalendar';
export { CalendarShell, type CalendarShellProps } from './components/CalendarShell';
export { useCalendarPanel, type CalendarPanelConfig } from './use-panel';
export { useCalendarInteractions } from './use-interactions';
export type { CalParams, CalEvent, ViewMeta } from './types';
export type { DuePayload, DueItem } from './assignment';
