/**
 * オーバーレイのログアウト操作を MAIN ワールドで実行する。
 * 隔離ワールドから `javascript:` リンクを click すると Chrome の CSP でブロックされるため。
 */

import { devWarn } from '../../lib/debug';
import { FETCH_HOOK } from '../../shared/constants';
import { findHostLogoffAnchor, triggerHostLogoffAnchor } from '../../shared/host-logoff';

export function installLogoffBridge(): void {
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (!e.data || e.data.type !== FETCH_HOOK.logoffTrigger) return;

    const anchor = findHostLogoffAnchor();
    if (!anchor) {
      window.location.assign('/portal/Login');
      return;
    }

    try {
      triggerHostLogoffAnchor(anchor);
    } catch (err) {
      devWarn('portal-hooks: logoff bridge failed', err);
    }
  });
}
