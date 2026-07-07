/** King LMS API パス判定（content script フック用）。 */

const MEMBERSHIPS_RE = /^\/learn\/api\/v1\/users\/[^/]+\/memberships(?:\/|$)/;

export const KING_LMS_CALENDAR_ITEMS_PATH = '/learn/api/v1/calendars/calendarItems';

export function isKingLmsMembershipsUrl(url: string, baseHref = location.href): boolean {
  try {
    return MEMBERSHIPS_RE.test(new URL(url, baseHref).pathname);
  } catch {
    return false;
  }
}

export function isKingLmsCalendarItemsUrl(url: string, baseHref = location.href): boolean {
  try {
    return new URL(url, baseHref).pathname === KING_LMS_CALENDAR_ITEMS_PATH;
  } catch {
    return false;
  }
}

export function isKingLmsCalendarPage(pathname = location.pathname): boolean {
  try {
    return /\/ultra\/calendar/.test(pathname);
  } catch {
    return false;
  }
}
