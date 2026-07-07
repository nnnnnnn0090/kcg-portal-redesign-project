/**
 * 調査用: King LMS の `/learn/api/` レスポンスを sessionStorage に記録する。
 * `?kcg_capture=1` または sessionStorage `kcgKingLmsCapture=1` 時のみ有効。
 */

export const KING_LMS_API_CAPTURE_KEY = 'kcgKingLmsApiCapture';

export type KingLmsApiCaptureRow = {
  href: string;
  url: string;
  pathname: string;
  search: string;
  capturedAt: number;
  raw: unknown;
};

export function isKingLmsApiCaptureEnabled(): boolean {
  try {
    if (new URLSearchParams(location.search).has('kcg_capture')) return true;
    return sessionStorage.getItem('kcgKingLmsCapture') === '1';
  } catch {
    return false;
  }
}

export function isKingLmsApiUrl(url: string): boolean {
  try {
    const u = new URL(url, location.href);
    return u.pathname.startsWith('/learn/api/');
  } catch {
    return false;
  }
}

export function appendKingLmsApiCapture(url: string, json: unknown): void {
  if (!isKingLmsApiCaptureEnabled()) return;
  try {
    const u = new URL(url, location.href);
    const row: KingLmsApiCaptureRow = {
      href: location.href,
      url: u.href,
      pathname: u.pathname,
      search: u.search,
      capturedAt: Date.now(),
      raw: json,
    };
    const prev = sessionStorage.getItem(KING_LMS_API_CAPTURE_KEY);
    const list: KingLmsApiCaptureRow[] = prev ? JSON.parse(prev) : [];
    if (!Array.isArray(list)) return;
    list.push(row);
    sessionStorage.setItem(KING_LMS_API_CAPTURE_KEY, JSON.stringify(list));
  } catch (error) {
    void error;
  }
}
