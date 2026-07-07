/**
 * 学ポータルで `document_end` に読み込まれ、ルートに応じて React オーバーレイをマウントします。
 */

import '../../styles/tailwind-overlay.css';
import { PORTAL_CONTENT_SCRIPT_MATCHES } from '../../contract/origins';
import { bootPortalContent } from '../../services/portal-boot';

export default defineContentScript({
  matches: [PORTAL_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_end',

  main() {
    void bootPortalContent();
  },
});
