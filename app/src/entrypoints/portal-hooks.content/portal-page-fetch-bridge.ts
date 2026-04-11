/** pageFetch メッセージに応じた認証付き fetch（401 時は短い間隔で再試行） */

import { devWarn } from '../../lib/debug';
import { FETCH_HOOK } from '../../shared/constants';

export function installFetchBridge(): void {
  const BASE_HEADERS: Record<string, string> = {
    'Accept':           'application/json, text/javascript, */*; q=0.01',
    'Content-Type':     'application/json; charset=utf-8',
    'X-Requested-With': 'XMLHttpRequest',
  };

  function hasCpAuthorize(): boolean {
    const cap = window.__portalCapturedApiHeaders;
    if (!cap) return false;
    return Object.keys(cap).some(k => k.toLowerCase() === 'x-cpauthorize' && cap[k]);
  }

  function doFetch(url: string, attempt: number): void {
    const headers = { ...BASE_HEADERS, ...(window.__portalCapturedApiHeaders ?? {}) };
    fetch(url, { credentials: 'include', cache: 'no-store', headers })
      .then((response) => {
        if (response.status === 401 && attempt < 10) {
          const delay = Math.min(100 + attempt * 200, 2200);
          setTimeout(() => doFetch(url, attempt + 1), delay);
        }
      })
      .catch((err) => {
        devWarn('portal-hooks: pageFetch bridge failed', url, err);
      });
  }

  function waitAndFetch(url: string): void {
    const deadline = Date.now() + 15000;
    function check() {
      if (hasCpAuthorize() || Date.now() >= deadline) { doFetch(url, 0); return; }
      setTimeout(check, 40);
    }
    check();
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (!e.data || e.data.type !== FETCH_HOOK.pageFetch) return;
    const url = e.data.url;
    if (url) waitAndFetch(String(url));
  });
}
