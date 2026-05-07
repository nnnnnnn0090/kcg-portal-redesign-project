/**
 * オーバーレイからの `pageFetch` メッセージに応じ、キャプチャしたヘッダー付きで `fetch` を実行します。
 * 401 のときは短い間隔で最大 10 回まで再試行します。
 * `X-CPAuthorize` は `PORTAL_CP_AUTHORIZE_READY` イベントと疎なポーリングの両方で待機解除します。
 */

import { devWarn } from '../../lib/debug';
import { FETCH_HOOK, PORTAL_CP_AUTHORIZE_READY } from '../../shared/constants';
import { hasPortalCpAuthorizeHeaders } from './portal-header-cache';

export function installFetchBridge(): void {
  const BASE_HEADERS: Record<string, string> = {
    'Accept':           'application/json, text/javascript, */*; q=0.01',
    'Content-Type':     'application/json; charset=utf-8',
    'X-Requested-With': 'XMLHttpRequest',
  };

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
    if (hasPortalCpAuthorizeHeaders()) {
      doFetch(url, 0);
      return;
    }
    const deadline = Date.now() + 15000;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let finished = false;

    const cleanup = () => {
      window.removeEventListener(PORTAL_CP_AUTHORIZE_READY, onReady);
      if (pollTimer !== null) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    };

    const done = () => {
      if (finished) return;
      finished = true;
      cleanup();
      doFetch(url, 0);
    };

    const onReady = () => done();

    window.addEventListener(PORTAL_CP_AUTHORIZE_READY, onReady);

    function poll(): void {
      if (hasPortalCpAuthorizeHeaders() || Date.now() >= deadline) {
        done();
        return;
      }
      pollTimer = setTimeout(poll, 200);
    }
    poll();
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (!e.data || e.data.type !== FETCH_HOOK.pageFetch) return;
    const url = e.data.url;
    if (url) waitAndFetch(String(url));
  });
}
