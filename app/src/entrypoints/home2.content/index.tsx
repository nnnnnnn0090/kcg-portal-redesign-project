/**
 * Home2 Web メールの対象 URL で React オーバーレイをマウントします。ホストページの `head` は置き換えません。
 */

import { matchHome2MailRoute } from '../../portal/home2-mail-router';
import { HOME2_MAIL_CONTENT_SCRIPT_MATCHES } from '../../shared/constants';
import { removePortalBackdrop } from '../../themes';
import { mountHome2MailOverlay } from './mount-home2-mail-overlay';

export default defineContentScript({
  matches: [...HOME2_MAIL_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_end',

  main() {
    const route = matchHome2MailRoute();
    if (!route) {
      removePortalBackdrop();
      return;
    }

    void mountHome2MailOverlay(route);
  },
});
