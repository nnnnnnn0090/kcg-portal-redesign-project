/**
 * Home2 Web メールで `document_start` に読み込まれ、オーバーレイ有効時のみテーマ変数とブートカバーを適用します。
 */

import { HOME2_MAIL_CONTENT_SCRIPT_MATCHES } from '../../contract/origins';
import { applyHome2EarlyBootCover } from '../../services/home2-host';
import { ensureExtensionOperationallyEnabled } from '../../services/extension-runtime';

export default defineContentScript({
  matches: [...HOME2_MAIL_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_start',

  main() {
    void (async () => {
      if (!(await ensureExtensionOperationallyEnabled())) return;
      await applyHome2EarlyBootCover();
    })();
  },
});
