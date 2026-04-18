/** Home2 Mail: document_start でテーマ変数とブートカバー */

import { bootCoverBg, portalHeadThemeCssByName } from '../../themes';
import {
  HOME2_MAIL_CONTENT_SCRIPT_MATCHES,
  PORTAL_DOM,
  SK,
} from '../../shared/constants';
import storage from '../../lib/storage';

export default defineContentScript({
  matches: [...HOME2_MAIL_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_start',

  main() {
    void (async () => {
      const snap = await storage.get([SK.home2WebMailOverlay, SK.theme]).catch(() => ({} as Record<string, unknown>));
      if (snap[SK.home2WebMailOverlay] === false) return;

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

      let themeStyle = document.getElementById(PORTAL_DOM.headThemeStyle) as HTMLStyleElement | null;
      if (!themeStyle) {
        themeStyle = document.createElement('style');
        themeStyle.id = PORTAL_DOM.headThemeStyle;
        themeStyle.textContent = portalHeadThemeCssByName('dark');
        (document.head ?? document.documentElement).appendChild(themeStyle);
      }

      const name = String(snap[SK.theme] ?? '').trim() || 'dark';
      themeStyle.textContent = portalHeadThemeCssByName(name);
      paintBootCover(bootCoverBg(name));
    })();
  },
});
