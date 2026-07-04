import { createElement } from 'react';
import '../../styles/tailwind-overlay.css';
import { CplanApp, readCplanSnapshot } from '../../components/cplan/CplanApp';
import storage from '../../lib/storage';
import { appendPortalOverlayShell, removePortalBackdrop, syncCplanSurfaceRuntime } from '../../themes';
import { CPLAN_CONTENT_SCRIPT_MATCHES, SK } from '../../shared/constants';

async function waitForCplanSnapshot() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const snapshot = readCplanSnapshot();
    if (snapshot) return snapshot;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return readCplanSnapshot();
}

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
        const snapshot = await waitForCplanSnapshot();
        if (!snapshot) {
          removePortalBackdrop();
          return;
        }

        const { overlay, scroller } = appendPortalOverlayShell();
        overlay.classList.add('p-surface-cplan');
        syncCplanSurfaceRuntime();

        const { createRoot } = await import('react-dom/client');
        createRoot(scroller).render(createElement(CplanApp, { snapshot }));
      } catch {
        removePortalBackdrop();
      }
    })();
  },
});
