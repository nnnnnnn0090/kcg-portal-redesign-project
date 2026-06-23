/**
 * King LMS の calendarItems 由来データを、カレンダー描画用の `CalEvent` へ変換するアダプタです。
 */

import { isoToMonthRef, calEventDayIso } from '../../lib/date';
import { KING_LMS_ORIGIN } from '../../shared/constants';
import type { CalEvent } from './types';

// ─── 型 ───────────────────────────────────────────────────────────────────

export interface DueItem {
  /** コース ID（数値または文字列）。URL 組み立てに使用 */
  courseId?:   string | number;
  courseName?: string;
  title?:      string;
  dueDate?:    string;
  /** calendarItems.itemSourceId（同一課題のマージに使用） */
  sourceId?:   string;
  /** gradebook user status から取得。true=提出済み, false=未提出 */
  submitted?: boolean;
}

export interface DuePayload {
  items:      DueItem[];
  capturedAt: number;
}

/** 課題カレンダーの描画オプション（授業カレンダー用のコース一覧は使わない） */
export const assignmentViewMeta = {
  kingLmsCourses: [] as Array<{ displayName?: string; externalAccessUrl?: string }>,
  calKind:        'assignment' as const,
};

// ─── ヘルパー ─────────────────────────────────────────────────────────────

function assignmentMergeKey(row: DueItem): string | null {
  const cid = String(row.courseId ?? '').trim();
  const sid = String(row.sourceId ?? '').trim();
  const due = String(row.dueDate ?? '').trim();
  if (!cid || !sid || !due) return null;
  return `${cid}\0${sid}\0${due}`;
}

function assignmentDisplayKey(row: DueItem): string {
  const start = String(row.dueDate ?? '').trim();
  const title = String(row.title ?? '').trim() || '（無題）';
  const cid   = String(row.courseId ?? '').trim();
  const dk    = calEventDayIso({ start });
  return `${dk}\0${start}\0${title}\0${cid}`;
}

function pickRepresentative(rows: DueItem[]): DueItem {
  const withStatus = rows.find((r) => typeof r.submitted === 'boolean');
  if (withStatus) return withStatus;
  return [...rows].sort((a, b) =>
    String(a.title ?? '').localeCompare(String(b.title ?? ''), 'ja'),
  )[0]!;
}

export { weekRangeContaining } from '../../lib/date';
export type { CalendarWeekStart } from '../../lib/date';

/**
 * 保存データの取得時刻（ミリ秒 epoch）から、注意書き用の相対表現を返す（秒まで表示）。
 */
export function formatKingLmsCapturedAgoJa(capturedAtMs: number, nowMs = Date.now()): string {
  const diff    = Math.max(0, nowMs - capturedAtMs);
  const totalSec = Math.floor(diff / 1000);
  if (totalSec < 1) return 'たった今';
  if (totalSec < 60) return `${totalSec}秒前に`;

  if (totalSec < 3600) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}分${s}秒前に`;
  }

  if (totalSec < 86400) {
    const h = Math.floor(totalSec / 3600);
    const r = totalSec % 3600;
    const m = Math.floor(r / 60);
    const s = r % 60;
    return `${h}時間${m}分${s}秒前に`;
  }

  const days = Math.floor(totalSec / 86400);
  if (days < 30) {
    const r1 = totalSec % 86400;
    const h  = Math.floor(r1 / 3600);
    const r2 = r1 % 3600;
    const m  = Math.floor(r2 / 60);
    const s  = r2 % 60;
    return `${days}日${h}時間${m}分${s}秒前に`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) return `約${months}か月前に`;
  return `約${Math.floor(days / 365)}年前に`;
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

/**
 * 課題ツールチップ用: 締切まで（または超過後）の残り時間を日本語で返す。
 */
export function formatRemainingUntilDue(iso: string, nowMs = Date.now()): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  let ms = t - nowMs;
  if (ms <= 0) {
    const over = -ms;
    const days = Math.floor(over / 86400000);
    if (days >= 1) return `期限から${days}日経過`;
    const hours = Math.floor(over / 3600000);
    if (hours >= 1) return `期限から約${hours}時間経過`;
    const mins = Math.floor(over / 60000);
    if (mins >= 1) return `期限から約${mins}分経過`;
    return '締切済み';
  }
  const days = Math.floor(ms / 86400000);
  ms -= days * 86400000;
  const hours = Math.floor(ms / 3600000);
  ms -= hours * 3600000;
  const mins = Math.floor(ms / 60000);
  const parts: string[] = [];
  if (days) parts.push(`${days}日`);
  if (hours) parts.push(`${hours}時間`);
  if (!days && !hours && mins) parts.push(`${mins}分`);
  if (!days && !hours && !mins) return 'まもなく締切';
  return `残り ${parts.join('')}`;
}

function buildAssignmentCalEvent(rep: DueItem): CalEvent {
  const start      = String(rep.dueDate).trim();
  const title      = String(rep.title ?? '').trim() || '（無題）';
  const courseName = String(rep.courseName ?? '').trim();
  const cid        = String(rep.courseId ?? '').trim();
  const tipLines: string[] = [
    courseName && `コース: ${courseName}`,
    `期限: ${formatDueLabel(start)}`,
    rep.submitted === true && '状態: 提出済み',
    rep.submitted === false && '状態: 未提出',
  ].filter(Boolean) as string[];
  const tip = tipLines.join('\n');
  const href = cid ? `${KING_LMS_ORIGIN}/ultra/courses/${encodeURIComponent(cid)}/outline` : '';
  return {
    start,
    title,
    tooltip: tip,
    calMeta: courseName,
    calTime: formatDueLabel(start),
    href,
    assignmentSubmitted: rep.submitted,
  };
}

/** 課題データ配列をカレンダーイベント配列に変換する */
export function dueItemsToCalEvents(raw: DueItem[]): CalEvent[] {
  const rows = (Array.isArray(raw) ? raw : []).filter(
    (r) => r && r.dueDate != null && String(r.dueDate).trim() !== '',
  );

  const mergeGroups = new Map<string, DueItem[]>();
  const unmerged: DueItem[] = [];

  for (const row of rows) {
    const mk = assignmentMergeKey(row);
    if (mk) {
      const list = mergeGroups.get(mk);
      if (list) list.push(row);
      else mergeGroups.set(mk, [row]);
    } else {
      unmerged.push(row);
    }
  }

  const unmergedBundles = new Map<string, DueItem[]>();
  for (const row of unmerged) {
    const dk = assignmentDisplayKey(row);
    const list = unmergedBundles.get(dk);
    if (list) list.push(row);
    else unmergedBundles.set(dk, [row]);
  }

  const out:    CalEvent[] = [];
  const seenDisp = new Set<string>();

  for (const [, group] of mergeGroups) {
    const rep   = pickRepresentative(group);
    const dedup = assignmentDisplayKey(rep);
    if (seenDisp.has(dedup)) continue;
    seenDisp.add(dedup);
    out.push(buildAssignmentCalEvent(rep));
  }

  for (const [, bundle] of unmergedBundles) {
    const rep   = pickRepresentative(bundle);
    const dedup = assignmentDisplayKey(rep);
    if (seenDisp.has(dedup)) continue;
    seenDisp.add(dedup);
    out.push(buildAssignmentCalEvent(rep));
  }

  out.sort((a, b) => String(a.start).localeCompare(String(b.start)));
  return out;
}

/** 今日を含む月の MonthRef を返す */
export function todayMonthRef(iso: string) {
  return isoToMonthRef(iso);
}
