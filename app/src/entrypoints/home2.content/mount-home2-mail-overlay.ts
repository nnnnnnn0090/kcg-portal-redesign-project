/**
 * Home2 Web メール: テーマ・ホスト用 CSS・オーバーレイ DOM・React のマウントまでをまとめる。
 */

import { createElement } from 'react';
import overlayCss from '../../styles/overlay.css?inline';
import {
  appendPortalOverlayShell,
  ensurePortalBackdrop,
  parseCustomThemeCollection,
  portalHeadThemeCssByName,
  removePortalBackdrop,
  syncPortalTheme,
  type StoredCustomThemeCollection,
} from '../../themes';
import storage from '../../lib/storage';
import type { Home2MailRoute } from '../../portal/home2-mail-router';
import {
  HOME2_MAIL_OVERLAY_HEADER_ONLY_CLASS,
  HOME2_MAIL_OVERLAY_SURFACE_CLASS,
  PORTAL_BOOT_COVER_RAF_FRAMES,
  PORTAL_DOM,
  SK,
} from '../../shared/constants';
import { hostTweakCssForHome2MailLayout } from './host-tweak-css';

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

export async function mountHome2MailOverlay(route: Home2MailRoute): Promise<void> {
  try {
    const themeSnap = await storage.get([SK.theme, SK.home2WebMailOverlay, SK.customThemes]);
    if (themeSnap[SK.home2WebMailOverlay] === false) {
      removePortalBackdrop();
      return;
    }
    const themeName = String(themeSnap[SK.theme] ?? '').trim() || 'dark';
    const customThemes = parseCustomThemeCollection(themeSnap[SK.customThemes]);

    let themeStyle = document.getElementById(PORTAL_DOM.headThemeStyle) as HTMLStyleElement | null;
    if (!themeStyle) {
      themeStyle = document.createElement('style');
      themeStyle.id = PORTAL_DOM.headThemeStyle;
      (document.head ?? document.documentElement).appendChild(themeStyle);
    }
    themeStyle.textContent = portalHeadThemeCssByName(themeName, customThemes);

    if (!document.getElementById(PORTAL_DOM.overlayCss)) {
      const overlayStyle = document.createElement('style');
      overlayStyle.id = PORTAL_DOM.overlayCss;
      overlayStyle.textContent = overlayCss;
      document.head.appendChild(overlayStyle);
    }

    const hostTweakCss = hostTweakCssForHome2MailLayout(route.layout);
    if (hostTweakCss) {
      let hostTweak = document.getElementById(PORTAL_DOM.home2HostTweak);
      if (!hostTweak) {
        hostTweak = document.createElement('style');
        hostTweak.id = PORTAL_DOM.home2HostTweak;
        document.head.appendChild(hostTweak);
      }
      hostTweak.textContent = hostTweakCss;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    const { overlay, scroller } = appendPortalOverlayShell();
    overlay.classList.add(HOME2_MAIL_OVERLAY_SURFACE_CLASS);
    if (route.layout === 'headerOnly') overlay.classList.add(HOME2_MAIL_OVERLAY_HEADER_ONLY_CLASS);

    syncPortalTheme(themeName, customThemes);

    const [{ createRoot }, { PortalApp }] = await Promise.all([
      import('react-dom/client'),
      import('../../portal/App'),
    ]);
    const root = createRoot(scroller);
    root.render(
      createElement(PortalApp, {
        surface: 'home2-mail',
        route,
        syncToastMsg: '',
        overlayRoot: scroller,
      }),
    );

    retainPortalBackdropAfterFrames(PORTAL_BOOT_COVER_RAF_FRAMES.default, themeName, customThemes);
  } catch {
    removePortalBackdrop();
  }
}
