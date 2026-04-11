/** portal.content — ポータル上で React オーバーレイをマウントする */

import { createElement } from 'react';
import overlayCss from '../../styles/overlay.css?inline';
import { matchPortalRoute } from '../../portal/router';
import { resolveKingLmsMountToastMessage } from '../../portal/sync-hash';
import { applyThemeToElement, portalHeadThemeCssByName, themeTokensForName } from '../../themes';
import storage from '../../lib/storage';
import {
  PORTAL_BOOT_COVER_RAF_FRAMES,
  PORTAL_CONTENT_SCRIPT_MATCHES,
  PORTAL_DOM,
  SK,
} from '../../shared/constants';

function removeBootCoverAfterFrames(frameCount: number): void {
  if (frameCount <= 0) {
    document.getElementById(PORTAL_DOM.bootCover)?.remove();
    return;
  }
  requestAnimationFrame(() => removeBootCoverAfterFrames(frameCount - 1));
}

export default defineContentScript({
  matches: [PORTAL_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_end',

  main() {
    const route = matchPortalRoute();
    if (!route) {
      document.getElementById(PORTAL_DOM.bootCover)?.remove();
      return;
    }

    void (async () => {
      try {
        const [syncToastMsg, themeSnap] = await Promise.all([
          resolveKingLmsMountToastMessage(),
          storage.get([SK.theme]),
        ]);
        const themeName = String(themeSnap[SK.theme] ?? '').trim() || 'dark';

        const preservedTheme = document.getElementById(PORTAL_DOM.headThemeStyle)?.textContent ?? '';
        const title = document.querySelector('title')?.cloneNode(true) ?? null;
        document.head.replaceChildren();
        if (title) document.head.appendChild(title);

        const themeStyle = document.createElement('style');
        themeStyle.id = PORTAL_DOM.headThemeStyle;
        themeStyle.textContent = preservedTheme || portalHeadThemeCssByName(themeName);
        document.head.appendChild(themeStyle);

        const overlayStyle = document.createElement('style');
        overlayStyle.id = PORTAL_DOM.overlayCss;
        overlayStyle.textContent = overlayCss;
        document.head.appendChild(overlayStyle);

        const overlay = document.createElement('div');
        overlay.id = PORTAL_DOM.overlayRoot;
        document.body.appendChild(overlay);

        applyThemeToElement(overlay, themeTokensForName(themeName));

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        const [{ createRoot }, { PortalApp }] = await Promise.all([
          import('react-dom/client'),
          import('../../portal/App'),
        ]);
        const root = createRoot(overlay);
        root.render(createElement(PortalApp, { route, syncToastMsg, overlayRoot: overlay }));

        const coverFrames = syncToastMsg
          ? PORTAL_BOOT_COVER_RAF_FRAMES.withToast
          : PORTAL_BOOT_COVER_RAF_FRAMES.default;
        removeBootCoverAfterFrames(coverFrames);
      } catch {
        document.getElementById(PORTAL_DOM.bootCover)?.remove();
      }
    })();
  },
});
