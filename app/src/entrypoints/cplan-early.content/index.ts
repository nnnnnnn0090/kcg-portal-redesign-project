import storage from '../../lib/storage';
import { CPLAN_CONTENT_SCRIPT_MATCHES, PORTAL_DOM, SK } from '../../shared/constants';

export default defineContentScript({
  matches: [...CPLAN_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_start',
  main() {
    const page = location.pathname.split('/').pop()?.toLowerCase() ?? '';
    if (!['loginform.aspx', 'mainmenu.aspx', 'mainmenuv2.aspx', 'category.aspx', 'categoryv2.aspx'].includes(page)) return;

    void storage.get(SK.cplanOverlay).then((snap) => {
      if (snap[SK.cplanOverlay] === false || document.documentElement.dataset.cplanOverlayDisabled === 'true') return;
      const cover = document.createElement('div');
      cover.id = PORTAL_DOM.bootCover;
      cover.setAttribute('aria-hidden', 'true');
      cover.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;background:#111111';
      (document.body ?? document.documentElement).appendChild(cover);
    });
  },
});
