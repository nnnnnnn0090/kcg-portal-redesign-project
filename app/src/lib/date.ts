/**
 * 日付計算ユーティリティ（DOM に依存しない純粋関数）。
 * HTML テキスト抽出（plainFromHtml）は DOM 依存のため dom.ts に置く。
 */

// ─── ISO 日付 ←→ Date ────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → ローカル 0 時 Date */
export function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date → "YYYY-MM-DD" */
export function toIsoLocal(d: Date): string {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/** ISO 日付に delta 日加算 */
export function addDaysIso(iso: string, delta: number): string {
  const d = parseIsoLocal(iso);
  d.setDate(d.getDate() + delta);
  return toIsoLocal(d);
}

/** [startIso, endIso) の日付列挙 */
export function enumerateRange(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  let cur = startIso;
  while (cur < endIso) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
  }
  return out;
}

// ─── 週・月範囲 ───────────────────────────────────────────────────────────────

/** 指定日以前の最も近い月曜日 */
function mondayOnOrBefore(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - (x.getDay() + 6) % 7);
  return x;
}

/** 指定年月の月カレンダーを 6 週分で表示する範囲（月曜始まり） */
export function sixWeekRange(year: number, monthIndex: number): { start: string; end: string } {
  const start = mondayOnOrBefore(new Date(year, monthIndex, 1));
  const end = new Date(start);
  end.setDate(end.getDate() + 42);
  return { start: toIsoLocal(start), end: toIsoLocal(end) };
}

// ─── MonthRef ─────────────────────────────────────────────────────────────────

export interface MonthRef { y: number; m: number }

export function isoToMonthRef(iso: string): MonthRef {
  const d = parseIsoLocal(iso);
  return { y: d.getFullYear(), m: d.getMonth() };
}

export function shiftMonthRef(ref: MonthRef, delta: number): MonthRef {
  let { y, m } = ref;
  m += delta;
  while (m < 0)  { m += 12; y -= 1; }
  while (m > 11) { m -= 12; y += 1; }
  return { y, m };
}

// ─── カレンダー年範囲 ─────────────────────────────────────────────────────────

/** 指定日を含む年の [Jan 1, Jan 1 翌年) 範囲 */
export function calendarYearRangeFromIso(iso: string): { start: string; end: string } {
  const y = parseIsoLocal(iso).getFullYear();
  return { start: `${y}-01-01`, end: `${y + 1}-01-01` };
}

/** 指定日の 1 年前の年範囲 */
export function calendarYearRangeBeforeInclusiveStart(startInclusive: string): { start: string; end: string } {
  const y = parseIsoLocal(startInclusive).getFullYear() - 1;
  return { start: `${y}-01-01`, end: `${y + 1}-01-01` };
}

// ─── カレンダーイベント日付 ───────────────────────────────────────────────────

/** イベントの start フィールドから "YYYY-MM-DD" を取り出す */
export function calEventDayIso(ev: { start?: unknown }): string {
  const raw = ev?.start;
  if (raw == null || raw === '') return '';
  const m = String(raw).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return '';
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}

/** start フィールドで範囲フィルタリング */
export function filterCalItemsByRange<T extends { start?: unknown }>(
  items: T[],
  startIso: string,
  endIsoExclusive: string,
): T[] {
  return (Array.isArray(items) ? items : []).filter((ev) => {
    const day = calEventDayIso(ev);
    return day && day >= startIso && day < endIsoExclusive;
  });
}

// ─── 週ナビゲーション ─────────────────────────────────────────────────────────

export function prevWeekRange(p: { uKbn: string; start: string; end: string }) {
  return { uKbn: p.uKbn, start: addDaysIso(p.start, -7), end: p.start };
}

export function nextWeekRange(p: { uKbn: string; start: string; end: string }) {
  return { uKbn: p.uKbn, start: p.end, end: addDaysIso(p.end, 7) };
}

// ─── 学年度 ───────────────────────────────────────────────────────────────────

/** 現在の学年度（4 月〜翌 3 月） */
export function currentNendo(): number {
  const now = new Date();
  const m = now.getMonth() + 1;
  return m >= 4 ? now.getFullYear() : now.getFullYear() - 1;
}
