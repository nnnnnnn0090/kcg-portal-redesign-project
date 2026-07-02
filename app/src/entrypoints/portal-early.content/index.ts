/**
 * 学ポータルで `document_start` に読み込まれ、初期テーマ用の `<style>` とブートカバーを差し込みます。
 * `storage` のテーマ値を読み、反映後にブートカバーの色を更新します。
 */

import { bootCoverBg, parseCustomThemeCollection, portalHeadThemeCssByName } from '../../themes';
import { PORTAL_CONTENT_SCRIPT_MATCHES, PORTAL_DOM, SK } from '../../shared/constants';
import storage from '../../lib/storage';

export default defineContentScript({
  matches: [PORTAL_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_start',

  main() {
    let bootCoverEl: HTMLElement | null = null;

    function paintBootCover(color: string): void {
      if (!bootCoverEl) {
        bootCoverEl = document.createElement('div');
        bootCoverEl.id = PORTAL_DOM.bootCover;
        bootCoverEl.setAttribute('aria-hidden', 'true');
        bootCoverEl.style.cssText =
          'position:fixed;inset:0;z-index:2147483646;pointer-events:none;margin:0;padding:0;border:0';
        (document.body ?? document.documentElement).appendChild(bootCoverEl);
      }
      bootCoverEl.style.background = color;
    }

    const themeStyle = document.createElement('style');
    themeStyle.id = PORTAL_DOM.headThemeStyle;
    themeStyle.textContent = portalHeadThemeCssByName('dark');
    (document.head ?? document.documentElement).appendChild(themeStyle);

    paintBootCover(bootCoverBg());

    void storage
      .get([SK.theme, SK.customThemes])
      .then((data) => {
        const name = String(data[SK.theme] ?? '');
        const customThemes = parseCustomThemeCollection(data[SK.customThemes]);
        const el = document.getElementById(PORTAL_DOM.headThemeStyle);
        if (el) el.textContent = portalHeadThemeCssByName(name, customThemes);
        paintBootCover(bootCoverBg(name, customThemes));
      })
      .catch(() => {});
  },
});
