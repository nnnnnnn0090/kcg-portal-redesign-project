/**
 * 学ポータルで `document_end` に読み込まれ、ルートに応じて React オーバーレイをマウントします。
 * `portal-hooks` が `postMessage` で流すデータを受け取る隔離ワールド側の UI です。
 */

import { createElement } from 'react';
import '../../styles/tailwind-overlay.css';
import { matchPortalRoute } from '../../portal/router';
import { resolveKingLmsMountToastMessage } from '../../portal/sync-hash';
import {
  appendPortalOverlayShell,
  ensurePortalBackdrop,
  parseCustomThemeCollection,
  removePortalBackdrop,
  syncPortalTheme,
  type StoredCustomThemeCollection,
} from '../../themes';
import storage from '../../lib/storage';
import {
  PORTAL_BOOT_COVER_RAF_FRAMES,
  PORTAL_CONTENT_SCRIPT_MATCHES,
  SK,
} from '../../shared/constants';

function retainPortalBackdropAfterFrames(
  frameCount: number,
  themeName: string,
  customThemes: StoredCustomThemeCollection,
): void {
  if (frameCount <= 0) {
    ensurePortalBackdrop(themeName, customThemes);
    return;
  }
  requestAnimationFrame(() =>
    retainPortalBackdropAfterFrames(frameCount - 1, themeName, customThemes),
  );
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
          storage.get([SK.theme, SK.customThemes]),
        ]);
        const themeName = String(themeSnap[SK.theme] ?? '').trim() || 'dark';
        const customThemes = parseCustomThemeCollection(themeSnap[SK.customThemes]);

        const title = document.querySelector('title')?.cloneNode(true) ?? null;
        document.head.replaceChildren();
        if (title) document.head.appendChild(title);

        const { scroller } = appendPortalOverlayShell();

        syncPortalTheme(themeName, customThemes);

        document.documentElement.classList.add('kcg-portal-surface');
        document.body?.classList.add('kcg-portal-surface');

        const [{ createRoot }, { PortalApp }] = await Promise.all([
          import('react-dom/client'),
          import('../../portal/App'),
        ]);
        const root = createRoot(scroller);
        root.render(
          createElement(PortalApp, {
            surface: 'portal',
            route,
            syncToastMsg,
            overlayRoot: scroller,
          }),
        );

        const coverFrames = syncToastMsg
          ? PORTAL_BOOT_COVER_RAF_FRAMES.withToast
          : PORTAL_BOOT_COVER_RAF_FRAMES.default;
        retainPortalBackdropAfterFrames(coverFrames, themeName, customThemes);
      } catch {
        removePortalBackdrop();
      }
    })();
  },
});
