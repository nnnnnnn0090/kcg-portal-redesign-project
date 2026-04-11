/** king-lms-bridge.content — King LMS 上の postMessage → storage とリダイレクト */

import { KING_LMS_ORIGIN } from '../../shared/constants';
import { isLoginRedirectPage } from './bridge-urls';
import { cancelPendingForLoginRedirect, maybeShowOverlayFromStorage } from './bridge-storage-sync';
import { installMessageListener } from './bridge-message-listener';

export default defineContentScript({
  matches: [`${KING_LMS_ORIGIN}/*`],
  runAt: 'document_start',

  main() {
    scheduleInit();
    installMessageListener();
  },
});

function scheduleInit(): void {
  function run(): void {
    if (isLoginRedirectPage()) { void cancelPendingForLoginRedirect(); return; }
    void maybeShowOverlayFromStorage();
  }
  if (document.body) run();
  else document.addEventListener('DOMContentLoaded', run, { once: true });
}
