/**
 * Home2 Web メールで `document_start` に読み込まれ、オーバーレイ有効時のみテーマ変数とブートカバーを適用します。
 */

import { ensurePortalBackdrop, parseCustomThemeCollection } from '../../themes';
import { HOME2_MAIL_CONTENT_SCRIPT_MATCHES, SK } from '../../shared/constants';
import storage from '../../lib/storage';

export default defineContentScript({
  matches: [...HOME2_MAIL_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_start',

  main() {
    void (async () => {
      const snap = await storage
        .get([SK.home2WebMailOverlay, SK.theme, SK.customThemes])
        .catch(() => ({}) as Record<string, unknown>);
      if (snap[SK.home2WebMailOverlay] === false) return;

      const name = String(snap[SK.theme] ?? '').trim() || 'dark';
      const customThemes = parseCustomThemeCollection(snap[SK.customThemes]);
      ensurePortalBackdrop(name, customThemes);
    })();
  },
});
