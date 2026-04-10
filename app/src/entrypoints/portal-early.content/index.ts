/**
 * portal-early.content — テーマ適用 + 起動カバー（隔離ワールド、document_start）
 */

import { bootCoverBg, portalHeadThemeCssByName } from '../../themes';
import { SK } from '../../shared/constants';
import storage from '../../lib/storage';

export default defineContentScript({
  matches: ['https://home.kcg.ac.jp/portal*'],
  runAt: 'document_start',

  main() {
    let bootCoverEl: HTMLElement | null = null;

    function paintBootCover(color: string): void {
      if (!bootCoverEl) {
        bootCoverEl = document.createElement('div');
        bootCoverEl.id = 'kcg-portal-boot-cover';
        bootCoverEl.setAttribute('aria-hidden', 'true');
        bootCoverEl.style.cssText =
          'position:fixed;inset:0;z-index:2147483646;pointer-events:none;margin:0;padding:0;border:0';
        (document.body ?? document.documentElement).appendChild(bootCoverEl);
      }
      bootCoverEl.style.background = color;
    }

    const themeStyle = document.createElement('style');
    themeStyle.id = 'portal-theme-vars';
    themeStyle.textContent = portalHeadThemeCssByName('dark');
    (document.head ?? document.documentElement).appendChild(themeStyle);

    paintBootCover(bootCoverBg());

    void storage.get(SK.theme).then((data) => {
      const name = String(data[SK.theme] ?? '');
      const el = document.getElementById('portal-theme-vars');
      if (el) el.textContent = portalHeadThemeCssByName(name);
      paintBootCover(bootCoverBg(name));
    }).catch(() => {});
  },
});
