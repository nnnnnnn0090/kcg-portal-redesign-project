/** ポータル API リクエストから認証関連ヘッダーを window に保持する */

import { isPortalApiUrl } from '../../lib/api-paths';

const CAPTURE_HEADERS = ['X-CPAuthorize', 'X-Requested-With', 'Content-Type', 'Accept'];

export function captureHeaders(url: string, headers: HeadersInit | undefined): void {
  if (!isPortalApiUrl(url) || !headers) return;
  try {
    const h = new Headers(headers);
    const cap = window.__portalCapturedApiHeaders ??= {};
    for (const k of CAPTURE_HEADERS) {
      const v = h.get(k);
      if (v) cap[k] = v;
    }
  } catch {}
}

export function captureXhrHeader(url: string, name: string, value: string): void {
  if (!isPortalApiUrl(url)) return;
  if (!['x-cpauthorize', 'x-requested-with', 'content-type', 'accept'].includes(name.toLowerCase())) return;
  (window.__portalCapturedApiHeaders ??= {})[name] = value;
}
