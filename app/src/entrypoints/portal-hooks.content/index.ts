/** portal-hooks.content — ポータル API の fetch / XHR フックと pageFetch ブリッジ */

import { PORTAL_CONTENT_SCRIPT_MATCHES } from '../../shared/constants';
import { installFetchHook } from './portal-fetch-hook';
import { installFetchBridge } from './portal-page-fetch-bridge';
import { installXhrHook } from './portal-xhr-hook';

export default defineContentScript({
  matches: [PORTAL_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_start',
  world: 'MAIN',

  main() {
    installFetchHook();
    installXhrHook();
    installFetchBridge();
  },
});
