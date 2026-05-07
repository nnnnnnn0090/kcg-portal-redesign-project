/**
 * カレンダーイベント一覧のマージと重複除去です。
 * 年単位のバルク取得結果をつなぐときに使います。
 */

import { calEventDayIso } from '../../lib/date';
import type { CalEvent } from './types';

/** 年度範囲を識別するキー文字列 */
export function rangeKey(start: string, end: string): string {
  return `${start}|${end}`;
}

/**
 * 2 つのイベント配列をマージし、重複を除きます。
 * 同一日・同一タイトル・tooltip 先頭 120 文字が一致すれば重複とみなします。
 */
export function mergeCalItemLists(a: CalEvent[], b: CalEvent[]): CalEvent[] {
  const seen = new Set<string>();
  const out: CalEvent[] = [];
  for (const ev of [...a, ...b]) {
    if (!ev || ev.start == null || ev.start === '') continue;
    const day = calEventDayIso(ev);
    if (!day) continue;
    // tooltip 全体をキーにすると長大な HTML が含まれる場合に Set が肥大化するため先頭 120 文字で代用。
    const tip = String(ev.tooltip ?? '').slice(0, 120);
    const k = `${day}\0${String(ev.title ?? '')}\0${tip}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(ev);
  }
  return out;
}
