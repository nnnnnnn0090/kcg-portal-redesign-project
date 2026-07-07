import { createElement } from 'react';
import { PORTAL_BOOT_COVER_RAF_FRAMES } from '../contract/dom';
import { SK } from '../contract/storage-keys';
import { matchPortalRoute } from '../domain/portal/router';
import {
  appendPortalOverlayShell,
  ensurePortalBackdrop,
  parseCustomThemeCollection,
  removePortalBackdrop,
  syncPortalTheme,
  type StoredCustomThemeCollection,
} from '../domain/themes';
import { resolveKingLmsMountToastMessage } from './sync-hash';
import {
  isExtensionBlockedByRemoteKillSwitch,
  startExtensionOperationalWatch,
} from './extension-runtime';
import { storageRepo } from '../platform/storage/repo';

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

/** portal.content ブート（F-003） */
export async function bootPortalContent(): Promise<void> {
  startExtensionOperationalWatch();
  if (isExtensionBlockedByRemoteKillSwitch()) return;

  const route = matchPortalRoute();
  if (!route) {
    removePortalBackdrop();
    return;
  }

  try {
    const [syncToastMsg, themeName, customThemesRaw] = await Promise.all([
      resolveKingLmsMountToastMessage(),
      storageRepo.getTheme(),
      storageRepo.getCustomThemes(),
    ]);
    const customThemes = parseCustomThemeCollection(customThemesRaw);

    const title = document.querySelector('title')?.cloneNode(true) ?? null;
    document.head.replaceChildren();
    if (title) document.head.appendChild(title);

    const { scroller } = appendPortalOverlayShell();

    syncPortalTheme(themeName, customThemes);

    document.documentElement.classList.add('kcg-portal-surface');
    document.body?.classList.add('kcg-portal-surface');

    const [{ createRoot }, { PortalApp }] = await Promise.all([
      import('react-dom/client'),
      import('../ui/app'),
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
}
