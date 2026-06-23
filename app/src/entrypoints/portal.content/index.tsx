/**
 * 学ポータルで `document_end` に読み込まれ、ルートに応じて React オーバーレイをマウントします。
 * `portal-hooks` が `postMessage` で流すデータを受け取る隔離ワールド側の UI です。
 */

import { createElement } from 'react';
import overlayCss from '../../styles/overlay.css?inline';
import { matchPortalRoute } from '../../portal/router';
import { resolveKingLmsMountToastMessage } from '../../portal/sync-hash';
import { appendPortalOverlayShell, ensurePortalBackdrop, portalHeadThemeCssByName, removePortalBackdrop, syncPortalTheme } from '../../themes';
import storage from '../../lib/storage';
import {
  PORTAL_BOOT_COVER_RAF_FRAMES,
  PORTAL_CONTENT_SCRIPT_MATCHES,
  PORTAL_DOM,
  SK,
} from '../../shared/constants';

function retainPortalBackdropAfterFrames(frameCount: number, themeName: string): void {
  if (frameCount <= 0) {
    ensurePortalBackdrop(themeName);
    return;
  }
  requestAnimationFrame(() => retainPortalBackdropAfterFrames(frameCount - 1, themeName));
}

export default defineContentScript({
  matches: [PORTAL_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_end',

  main() {
    const route = matchPortalRoute();
    if (!route) {
      removePortalBackdrop();
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

        const { scroller } = appendPortalOverlayShell();

        syncPortalTheme(themeName);

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        const [{ createRoot }, { PortalApp }] = await Promise.all([
          import('react-dom/client'),
          import('../../portal/App'),
        ]);
        const root = createRoot(scroller);
        root.render(
          createElement(PortalApp, {
            surface:      'portal',
            route,
            syncToastMsg,
            overlayRoot: scroller,
          }),
        );

        const coverFrames = syncToastMsg
          ? PORTAL_BOOT_COVER_RAF_FRAMES.withToast
          : PORTAL_BOOT_COVER_RAF_FRAMES.default;
        retainPortalBackdropAfterFrames(coverFrames, themeName);
      } catch {
        removePortalBackdrop();
      }
    })();
  },
});
