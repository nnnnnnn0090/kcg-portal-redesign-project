/**
 * ポータル API の URL ビルダーと `pageFetch` ユーティリティ。
 * 各エンドポイントの URL を組み立て、fetch 橋渡しリクエストを postMessage で送出する。
 */

import { FETCH_HOOK } from '../shared/constants';
import { PORTAL_API } from './api-paths';
import type { CalParams } from '../features/calendar/types';

export type { CalParams };

// ─── URL ビルダー ─────────────────────────────────────────────────────────

function calUrl(endpoint: string, params: CalParams): string {
  const u = new URL(`/portal/api/${endpoint}/`, location.origin);
  u.searchParams.set('uKbn',  params.uKbn);
  u.searchParams.set('start', params.start);
  u.searchParams.set('end',   params.end);
  return u.href;
}

/** ポータル素 HTML の #lastLoginDt（API の lastLogin クエリ用・前後空白のみ除去） */
export function portalLastLoginRaw(): string {
  return (document.getElementById('lastLoginDt')?.textContent ?? '').trim();
}

/** ヘッダー表示用（連続空白を 1 つに畳む） */
export function portalLastLoginCollapsed(): string {
  return (document.getElementById('lastLoginDt')?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export const urls = {
  kogiCalendar:   (p: CalParams) => calUrl(PORTAL_API.kogiCalendar,   p),
  hoshuCalendar:  (p: CalParams) => calUrl(PORTAL_API.hoshuCalendar,  p),
  campusCalendar: (p: CalParams) => calUrl(PORTAL_API.campusCalendar, p),

  kogiNews(): string {
    const u = new URL(`/portal/api/${PORTAL_API.kogiNews}/`, location.origin);
    const ll = portalLastLoginRaw();
    if (ll) u.searchParams.set('lastLogin', ll);
    return u.href;
  },

  kinoMessage(id: number): string {
    const u = new URL(`/portal/api/${PORTAL_API.portalKinoMessage}/`, location.origin);
    u.searchParams.set('id', String(id));
    return u.href;
  },

  deliveredNendo(nendo: string | number, lastLogin: string): string {
    const u = new URL(
      `/portal/api/${PORTAL_API.deliveredNews}/Nendo/${encodeURIComponent(String(nendo))}/`,
      location.origin,
    );
    const ll = String(lastLogin ?? '').trim();
    if (ll) u.searchParams.set('lastLogin', ll);
    return u.href;
  },

  deliveredDetail: (id: string | number) =>
    new URL(
      `/portal/api/${PORTAL_API.deliveredNews}/${encodeURIComponent(String(id))}/`,
      location.origin,
    ).href,

  kyukoInfo: (nendo: string | number) => {
    const u = new URL(`/portal/api/${PORTAL_API.kyukoInfo}`, location.origin);
    u.searchParams.set('nendo', String(nendo));
    return u.href;
  },

  hokoInfo: (nendo: string | number) => {
    const u = new URL(`/portal/api/${PORTAL_API.hokoInfo}`, location.origin);
    u.searchParams.set('nendo', String(nendo));
    return u.href;
  },

  kyoshitsuChange: (nendo: string | number) => {
    const u = new URL(`/portal/api/${PORTAL_API.kyoshitsuChange}`, location.origin);
    u.searchParams.set('nendo', String(nendo));
    return u.href;
  },

  questionnaireInfo: () =>
    new URL(`/portal/api/${PORTAL_API.questionnaireInfo}`, location.origin).href,
};

// ─── pageFetch ────────────────────────────────────────────────────────────

/** pageFetch 用 postMessage（portal-hooks のブリッジが処理） */
export function pageFetch(url: string): void {
  window.postMessage({ type: FETCH_HOOK.pageFetch, url: String(url) }, '*');
}

// ─── カレンダー URL パース ─────────────────────────────────────────────────

/** カレンダー API のリクエスト URL から { uKbn, start, end } を取り出す */
export function parseCalendarRequest(href: string): CalParams | null {
  try {
    const u = new URL(href, location.origin);
    const start = u.searchParams.get('start');
    const end   = u.searchParams.get('end');
    const uKbn  = u.searchParams.get('uKbn') ?? '1';
    if (!start || !end) return null;
    return { uKbn, start, end };
  } catch {
    return null;
  }
}
