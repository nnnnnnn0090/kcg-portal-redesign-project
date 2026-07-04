import storage from '../../lib/storage';
import { CPLAN_CONTENT_SCRIPT_MATCHES, PORTAL_DOM, SK } from '../../shared/constants';
import { syncCplanSurfaceRuntime } from '../../themes';

export default defineContentScript({
  matches: [...CPLAN_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_start',
  main() {
    const page = location.pathname.split('/').pop()?.toLowerCase() ?? '';
    if (![
      'loginform.aspx',
      'mainmenu.aspx',
      'mainmenuv2.aspx',
      'category.aspx',
      'categoryv2.aspx',
      'wsk_gakuseishukketsushinsei.aspx',
    ].includes(page)) return;

    void storage.get(SK.cplanOverlay).then((snap) => {
      if (snap[SK.cplanOverlay] === false || document.documentElement.dataset.cplanOverlayDisabled === 'true') return;
      syncCplanSurfaceRuntime();
      const cover = document.createElement('div');
      cover.id = PORTAL_DOM.bootCover;
      cover.className = 'tw-fixed tw-inset-0 tw-z-boot-cover tw-pointer-events-none tw-m-0 tw-h-full tw-w-full tw-border-0 tw-p-0';
      cover.setAttribute('aria-hidden', 'true');
      (document.body ?? document.documentElement).appendChild(cover);
    });
  },
});
