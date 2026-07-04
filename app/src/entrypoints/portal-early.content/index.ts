/**
 * 学ポータルで `document_start` に読み込まれ、初期テーマ変数とブートカバーを差し込みます。
 * `storage` のテーマ値を読み、反映後にブートカバーの色を更新します。
 */

import { ensurePortalBackdrop, parseCustomThemeCollection } from '../../themes';
import { PORTAL_CONTENT_SCRIPT_MATCHES, SK } from '../../shared/constants';
import storage from '../../lib/storage';

export default defineContentScript({
  matches: [PORTAL_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_start',

  main() {
    ensurePortalBackdrop('dark');

    void storage
      .get([SK.theme, SK.customThemes])
      .then((data) => {
        const name = String(data[SK.theme] ?? '');
        const customThemes = parseCustomThemeCollection(data[SK.customThemes]);
        ensurePortalBackdrop(name || 'dark', customThemes);
      })
      .catch(() => {});
  },
});
