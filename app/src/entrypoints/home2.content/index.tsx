/** Home2 Web Mail: `/Mail` 配下でオーバーレイをマウント（ホストの head は変更しない） */

import { createElement } from 'react';
import overlayCss from '../../styles/overlay.css?inline';
import { matchHome2MailRoute } from '../../portal/home2-mail-router';
import { applyThemeToElement, portalHeadThemeCssByName, themeTokensForName } from '../../themes';
import storage from '../../lib/storage';
import {
  HOME2_MAIL_OVERLAY_HEADER_ONLY_CLASS,
  HOME2_MAIL_OVERLAY_SURFACE_CLASS,
  PORTAL_BOOT_COVER_RAF_FRAMES,
  HOME2_MAIL_CONTENT_SCRIPT_MATCHES,
  PORTAL_DOM,
  SK,
} from '../../shared/constants';

const HOME2_MAIL_LOGIN_HOST_TWEAK_CSS = `
.page > div:first-of-type {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
.page .main #divTitle,
.page .main #divLogin {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
.page .main #MainContent_chkShowLastPage {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  margin: -1px !important;
  padding: 0 !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
.page .main > hr:first-of-type {
  visibility: hidden !important;
  height: 0 !important;
  margin: 0 !important;
  border: 0 !important;
}
.page .footer {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
}
`;

const HOME2_MAIL_MAILHEAD_HOST_TWEAK_CSS = `
.page > div:first-of-type {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
.page .main > div:first-of-type {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
#MainContent_Table_HEAD,
#MainContent_Table1,
#MainContent_butLogout {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
.page .footer {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
}
`;

const HOME2_MAIL_SENDMAIL_HOST_TWEAK_CSS = `
.page > div:first-of-type {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
.page .main #MainContent_Label1,
.page .main #MainContent_Label2,
.page .main #MainContent_Label3,
.page .main #MainContent_Label4,
.page .main #MainContent_Label5,
.page .main #MainContent_Label6,
.page .main #MainContent_Label8,
.page .main label[for="MainContent_CheckBox1"],
.page .main label[for="MainContent_chkKakunin"],
.page .main #MainContent_txtSendAdd,
.page .main #MainContent_txtSub,
.page .main #MainContent_txtMyAdd,
.page .main #MainContent_txtCC,
.page .main #MainContent_txtBody,
.page .main #MainContent_CheckBox1,
.page .main #MainContent_chkKakunin,
.page .main #MainContent_FileUpload1,
.page .main #MainContent_butFileAdd,
.page .main #MainContent_butDelFile,
.page .main #MainContent_butSend,
.page .main #MainContent_butRetHead,
.page .main #MainContent_butLogout,
.page .main #MainContent_lstAddFiles,
.page .main #MainContent_labAddFileInfo,
.page .main #MainContent_labByte,
.page .main #MainContent_labSendError,
.page .main #MainContent_RegularExpressionValidator1,
.page .main > hr {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
.page .footer {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
}
`;

const HOME2_MAIL_READMAIL_HOST_TWEAK_CSS = `
.page > div:first-of-type {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
.page .main > div:first-of-type {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
#MainContent_Table1,
#MainContent_txtBody,
#MainContent_Table2,
#MainContent_ListBox1,
#MainContent_butBinFileSave,
#MainContent_butLogout {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
.page .footer {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
}
`;

function removeBootCoverAfterFrames(frameCount: number): void {
  if (frameCount <= 0) {
    document.getElementById(PORTAL_DOM.bootCover)?.remove();
    return;
  }
  requestAnimationFrame(() => removeBootCoverAfterFrames(frameCount - 1));
}

export default defineContentScript({
  matches: [...HOME2_MAIL_CONTENT_SCRIPT_MATCHES],
  runAt: 'document_end',

  main() {
    const route = matchHome2MailRoute();
    if (!route) {
      document.getElementById(PORTAL_DOM.bootCover)?.remove();
      return;
    }

    void (async () => {
      try {
        const themeSnap = await storage.get([SK.theme, SK.home2WebMailOverlay]);
        if (themeSnap[SK.home2WebMailOverlay] === false) {
          document.getElementById(PORTAL_DOM.bootCover)?.remove();
          return;
        }
        const themeName = String(themeSnap[SK.theme] ?? '').trim() || 'dark';

        let themeStyle = document.getElementById(PORTAL_DOM.headThemeStyle) as HTMLStyleElement | null;
        if (!themeStyle) {
          themeStyle = document.createElement('style');
          themeStyle.id = PORTAL_DOM.headThemeStyle;
          (document.head ?? document.documentElement).appendChild(themeStyle);
        }
        themeStyle.textContent = portalHeadThemeCssByName(themeName);

        if (!document.getElementById(PORTAL_DOM.overlayCss)) {
          const overlayStyle = document.createElement('style');
          overlayStyle.id = PORTAL_DOM.overlayCss;
          overlayStyle.textContent = overlayCss;
          document.head.appendChild(overlayStyle);
        }

        if (route.layout === 'full' || route.layout === 'mailHead' || route.layout === 'readMail' || route.layout === 'sendMail') {
          let hostTweak = document.getElementById(PORTAL_DOM.home2HostTweak);
          if (!hostTweak) {
            hostTweak = document.createElement('style');
            hostTweak.id = PORTAL_DOM.home2HostTweak;
            document.head.appendChild(hostTweak);
          }
          hostTweak.textContent = route.layout === 'full'
            ? HOME2_MAIL_LOGIN_HOST_TWEAK_CSS
            : route.layout === 'mailHead'
              ? HOME2_MAIL_MAILHEAD_HOST_TWEAK_CSS
              : route.layout === 'readMail'
                ? HOME2_MAIL_READMAIL_HOST_TWEAK_CSS
                : HOME2_MAIL_SENDMAIL_HOST_TWEAK_CSS;
          document.documentElement.style.overflow = 'hidden';
          document.body.style.overflow = 'hidden';
        }

        const overlay = document.createElement('div');
        overlay.id = PORTAL_DOM.overlayRoot;
        overlay.classList.add(HOME2_MAIL_OVERLAY_SURFACE_CLASS);
        if (route.layout === 'headerOnly') overlay.classList.add(HOME2_MAIL_OVERLAY_HEADER_ONLY_CLASS);
        document.body.appendChild(overlay);

        applyThemeToElement(overlay, themeTokensForName(themeName));

        const [{ createRoot }, { PortalApp }] = await Promise.all([
          import('react-dom/client'),
          import('../../portal/App'),
        ]);
        const root = createRoot(overlay);
        root.render(
          createElement(PortalApp, {
            surface:      'home2-mail',
            route,
            syncToastMsg: '',
            overlayRoot:  overlay,
          }),
        );

        removeBootCoverAfterFrames(PORTAL_BOOT_COVER_RAF_FRAMES.default);
      } catch {
        document.getElementById(PORTAL_DOM.bootCover)?.remove();
      }
    })();
  },
});
