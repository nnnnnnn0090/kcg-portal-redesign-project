import { createElement } from 'react';
import overlayCss from '../../styles/overlay.css?inline';
import { CplanApp, readCplanSnapshot } from '../../components/cplan/CplanApp';
import storage from '../../lib/storage';
import { appendPortalOverlayShell, removePortalBackdrop } from '../../themes';
import { CPLAN_CONTENT_SCRIPT_MATCHES, PORTAL_DOM, SK } from '../../shared/constants';

export default defineContentScript({
  matches: [...CPLAN_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_end',
  main() {
    void (async () => {
      try {
        const setting = await storage.get(SK.cplanOverlay);
        if (setting[SK.cplanOverlay] === false) {
          document.documentElement.dataset.cplanOverlayDisabled = 'true';
          removePortalBackdrop();
          return;
        }
        const snapshot = readCplanSnapshot();
        if (!snapshot) {
          removePortalBackdrop();
          return;
        }

        const style = document.createElement('style');
        style.id = PORTAL_DOM.overlayCss;
        style.textContent = overlayCss;
        document.head.appendChild(style);

        const { overlay, scroller } = appendPortalOverlayShell();
        overlay.classList.add('p-surface-cplan');
        overlay.style.background = '#111111';
        document.documentElement.style.backgroundColor = '#111111';
        document.body.style.backgroundColor = '#111111';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        const { createRoot } = await import('react-dom/client');
        createRoot(scroller).render(createElement(CplanApp, { snapshot }));
        const cover = document.getElementById(PORTAL_DOM.bootCover) as HTMLElement | null;
        if (cover) cover.style.background = '#111111';
      } catch {
        removePortalBackdrop();
      }
    })();
  },
});
