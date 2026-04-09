/**
 * core/date.js — 日付計算ユーティリティ
 *
 * ロード順: document_idle（core/dom.js の後）。
 *
 * ISO 日付文字列（"YYYY-MM-DD"）を基軸とした、
 * タイムゾーン変換のないローカル時刻固定の日付計算関数群。
 *
 * 「タイムゾーン変換なし」とは:
 *   new Date("2025-04-07") は UTC 0時として解釈されるが、
 *   new Date(2025, 3, 7) はローカル 0時として解釈される。
 *   このモジュールは後者（ローカル 0時）で一貫して扱う。
 *
 * 公開: P.parseIsoLocal, P.toIsoLocal, P.addDaysIso, P.enumerateRange,
 *        P.sixWeekRange, P.isoToMonthRef, P.shiftMonthRef,
 *        P.calendarYearRangeFromIso, P.calendarYearRangeBeforeInclusiveStart,
 *        P.calEventDayIso, P.filterCalItemsByRange,
 *        P.prevWeekRange, P.nextWeekRange, P.plainFromHtml
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // ────────────────────────────────────────────
  // 基本変換
  // ────────────────────────────────────────────

  /**
   * "YYYY-MM-DD" 文字列をローカル 0時の Date に変換する。
   * @param {string} iso
   * @returns {Date}
   */
  function parseIsoLocal(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /**
   * Date をローカル時刻で "YYYY-MM-DD" 文字列に変換する。
   * @param {Date} d
   * @returns {string}
   */
  function toIsoLocal(d) {
    const y  = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }

  // ────────────────────────────────────────────
  // 加算 / 列挙
  // ────────────────────────────────────────────

  /**
   * ISO 日付に delta 日を加算して返す。
   * @param {string} iso
   * @param {number} delta
   * @returns {string}
   */
  function addDaysIso(iso, delta) {
    const d = parseIsoLocal(iso);
    d.setDate(d.getDate() + delta);
    return toIsoLocal(d);
  }

  /**
   * startIso 以上・endIso 未満（端点は含まない）の日付を列挙した配列を返す。
   * @param {string} startIso
   * @param {string} endIso
   * @returns {string[]}
   */
  function enumerateRange(startIso, endIso) {
    const out = [];
    let cur = startIso;
    while (cur < endIso) {
      out.push(cur);
      cur = addDaysIso(cur, 1);
    }
    return out;
  }

  // ────────────────────────────────────────────
  // 週・月 範囲
  // ────────────────────────────────────────────

  /**
   * d 以前で最も近い月曜日の Date を返す（週カレンダーの起点計算用）。
   * @param {Date} d
   * @returns {Date}
   */
  function mondayOnOrBefore(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    // getDay(): 0=日, 1=月, ..., 6=土  → (day + 6) % 7 で月曜基準に変換
    x.setDate(x.getDate() - (x.getDay() + 6) % 7);
    return x;
  }

  /**
   * 指定年月の月カレンダー用 6 週間（42 日）の範囲を返す。
   * 月初日を含む月曜から始める。
   *
   * @param {number} year
   * @param {number} monthIndex - 0 始まり（0=1月）
   * @returns {{ start: string, end: string }}
   */
  function sixWeekRange(year, monthIndex) {
    const start = mondayOnOrBefore(new Date(year, monthIndex, 1));
    const end   = new Date(start);
    end.setDate(end.getDate() + 42);
    return { start: toIsoLocal(start), end: toIsoLocal(end) };
  }

  /**
   * ISO 日付から { y, m } の月参照オブジェクトを作る。
   * @param {string} iso
   * @returns {{ y: number, m: number }}
   */
  function isoToMonthRef(iso) {
    const d = parseIsoLocal(iso);
    return { y: d.getFullYear(), m: d.getMonth() };
  }

  /**
   * 月参照を delta ヶ月分ずらす（繰り上がり・繰り下がり対応）。
   * @param {{ y: number, m: number }} ref
   * @param {number} delta
   * @returns {{ y: number, m: number }}
   */
  function shiftMonthRef(ref, delta) {
    let { y, m } = ref;
    m += delta;
    while (m < 0)  { m += 12; y -= 1; }
    while (m > 11) { m -= 12; y += 1; }
    return { y, m };
  }

  // ────────────────────────────────────────────
  // カレンダー年範囲（API バルク取得用）
  // ────────────────────────────────────────────

  /**
   * ISO 日付が属する暦年の [1/1, 翌年1/1) を返す（end は含まない）。
   * @param {string} iso
   * @returns {{ start: string, end: string }}
   */
  function calendarYearRangeFromIso(iso) {
    const y = parseIsoLocal(iso).getFullYear();
    return { start: `${y}-01-01`, end: `${y + 1}-01-01` };
  }

  /**
   * startInclusive の前の暦年の範囲を返す（バルクデータの前年拡張用）。
   * @param {string} startInclusive
   * @returns {{ start: string, end: string }}
   */
  function calendarYearRangeBeforeInclusiveStart(startInclusive) {
    const y = parseIsoLocal(startInclusive).getFullYear() - 1;
    return { start: `${y}-01-01`, end: `${y + 1}-01-01` };
  }

  // ────────────────────────────────────────────
  // カレンダーイベント日付の抽出・フィルタリング
  // ────────────────────────────────────────────

  /**
   * カレンダーイベントの start フィールドから暦日 "YYYY-MM-DD" を返す。
   * ISO 日時（"2025-04-07T09:30:00"）にも対応する。
   *
   * @param {{ start?: unknown }} ev
   * @returns {string}
   */
  function calEventDayIso(ev) {
    const raw = ev && ev.start;
    if (raw == null || raw === '') return '';
    const str = String(raw).trim();
    const m   = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return '';
    const mo = String(m[2]).padStart(2, '0');
    const da = String(m[3]).padStart(2, '0');
    return `${m[1]}-${mo}-${da}`;
  }

  /**
   * カレンダーイベント配列を半開区間 [startIso, endIsoExclusive) に絞る。
   * @param {unknown[]} items
   * @param {string} startIso
   * @param {string} endIsoExclusive
   * @returns {unknown[]}
   */
  function filterCalItemsByRange(items, startIso, endIsoExclusive) {
    return (Array.isArray(items) ? items : []).filter((ev) => {
      const day = calEventDayIso(ev);
      return day && day >= startIso && day < endIsoExclusive;
    });
  }

  // ────────────────────────────────────────────
  // 週ナビゲーション
  // ────────────────────────────────────────────

  /**
   * 前週の { uKbn, start, end } を返す（「戻る」ボタン用）。
   * @param {{ uKbn: string, start: string, end: string }} p
   * @returns {{ uKbn: string, start: string, end: string }}
   */
  function prevWeekRange(p) {
    return { uKbn: p.uKbn, start: addDaysIso(p.start, -7), end: p.start };
  }

  /**
   * 次週の { uKbn, start, end } を返す（「次へ」ボタン用）。
   * @param {{ uKbn: string, start: string, end: string }} p
   * @returns {{ uKbn: string, start: string, end: string }}
   */
  function nextWeekRange(p) {
    return { uKbn: p.uKbn, start: p.end, end: addDaysIso(p.end, 7) };
  }

  // ────────────────────────────────────────────
  // HTML → プレーンテキスト変換（カレンダーツールチップ用）
  // ────────────────────────────────────────────

  // ブロック要素とみなすタグ（改行を補完する判定に使う）
  const BLOCK_TAGS = new Set([
    'p', 'div', 'li', 'tr', 'section', 'article',
    'header', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  ]);

  function walkText(node) {
    let out = '';
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'br') { out += '\n'; continue; }
        const inner = walkText(child);
        if (BLOCK_TAGS.has(tag)) {
          const t = inner.trim();
          if (t) out += (out && !/\n\s*$/.test(out) ? '\n' : '') + t + '\n';
        } else {
          out += inner;
        }
      }
    }
    return out;
  }

  /**
   * HTML 文字列をプレーンテキストに変換する。
   * 改行がない場合は「教室:」「時限:」などのラベル前で自動改行を補完する。
   *
   * @param {string} html
   * @returns {string}
   */
  function plainFromHtml(html) {
    const s = String(html ?? '');
    if (!s) return '';
    const doc = new DOMParser().parseFromString(s, 'text/html');
    let t = walkText(doc.body)
      .replace(/\u00a0/g, ' ')         // nbsp → 通常スペース
      .replace(/[ \t\f\v]+\n/g, '\n')  // 行末の空白を除去
      .replace(/\n[ \t\f\v]+/g, '\n')  // 行頭の空白を除去
      .replace(/\n{3,}/g, '\n\n')      // 3行以上の連続改行を2行に圧縮
      .trim();

    // 改行が一切ない場合は「教室:」「時限:」等の区切りで改行を補完
    if (!/\n/.test(t)) {
      t = t
        .replace(/\s*(?=(?:教室|時限|担当|科目|講師|備考|コメント)[：:])/g, '\n')
        .replace(/([。．])\s*(?=\S)/g, '$1\n')
        .trim();
    }
    return t;
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  Object.assign(P, {
    parseIsoLocal, toIsoLocal, addDaysIso, enumerateRange,
    sixWeekRange, isoToMonthRef, shiftMonthRef,
    calendarYearRangeFromIso, calendarYearRangeBeforeInclusiveStart,
    calEventDayIso, filterCalItemsByRange,
    prevWeekRange, nextWeekRange,
    plainFromHtml,
  });

})(typeof globalThis !== 'undefined' ? globalThis : window);
