/**
 * King LMS の課題データをカレンダーイベントに変換するアダプタ。
 */

import { toIsoLocal, addDaysIso, parseIsoLocal, isoToMonthRef, calEventDayIso } from '../../lib/date';
import { KING_LMS_ORIGIN } from '../../shared/constants';
import type { CalEvent } from './types';

// ─── 型 ───────────────────────────────────────────────────────────────────

export interface DueItem {
  /** コース ID（数値または文字列）。URL 組み立てに使用 */
  courseId?:   string | number;
  courseName?: string;
  title?:      string;
  dueDate?:    string;
}

export interface DuePayload {
  items:      DueItem[];
  capturedAt: number;
}

// ─── 定数 ─────────────────────────────────────────────────────────────────

/** 課題カレンダーの描画オプション（授業カレンダー用のコース一覧は使わない） */
export const assignmentViewMeta = {
  kingLmsCourses: [] as Array<{ displayName?: string; externalAccessUrl?: string }>,
  calKind:        'assignment' as const,
};

// ─── ヘルパー ─────────────────────────────────────────────────────────────

/** 今日を含む週の範囲を返す（月曜始まり） */
export function weekRangeContaining(iso: string): { uKbn: string; start: string; end: string } {
  const d   = parseIsoLocal(iso);
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
  const start = toIsoLocal(mon);
  return { uKbn: '0', start, end: addDaysIso(start, 7) };
}

/** 期限日時を日本語形式にフォーマット */
export function formatDueLabel(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

/** 課題データ配列をカレンダーイベント配列に変換する */
export function dueItemsToCalEvents(raw: DueItem[]): CalEvent[] {
  const out: CalEvent[] = [];
  const seen = new Set<string>();
  for (const row of Array.isArray(raw) ? raw : []) {
    if (!row || row.dueDate == null || String(row.dueDate).trim() === '') continue;
    const start      = String(row.dueDate).trim();
    const title      = String(row.title ?? '').trim() || '（無題）';
    const courseName = String(row.courseName ?? '').trim();
    const cid        = String(row.courseId ?? '').trim();
    const dk         = calEventDayIso({ start });
    const dedup      = `${dk}\0${start}\0${title}\0${cid}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);
    const tip  = [courseName && `コース: ${courseName}`, `期限: ${formatDueLabel(start)}`].filter(Boolean).join('\n');
    const href = cid ? `${KING_LMS_ORIGIN}/ultra/courses/${encodeURIComponent(cid)}/outline` : '';
    out.push({ start, title, tooltip: tip, calMeta: courseName, calTime: formatDueLabel(start), href });
  }
  out.sort((a, b) => String(a.start).localeCompare(String(b.start)));
  return out;
}

/** 今日を含む月の MonthRef を返す */
export function todayMonthRef(iso: string) {
  return isoToMonthRef(iso);
}
