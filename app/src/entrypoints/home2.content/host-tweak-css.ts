/**
 * Home2 Web メールのホストページ用 CSS（レイアウト別）。オーバーレイ表示時に `style` 要素へ注入する。
 */

import type { Home2MailLayout } from '../../portal/home2-mail-router';

export const HOME2_MAIL_LOGIN_HOST_TWEAK_CSS = `
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

export const HOME2_MAIL_MAILHEAD_HOST_TWEAK_CSS = `
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

export const HOME2_MAIL_SENDMAIL_HOST_TWEAK_CSS = `
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

export const HOME2_MAIL_READMAIL_HOST_TWEAK_CSS = `
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

export function hostTweakCssForHome2MailLayout(layout: Home2MailLayout): string | null {
  switch (layout) {
    case 'full':
      return HOME2_MAIL_LOGIN_HOST_TWEAK_CSS;
    case 'mailHead':
      return HOME2_MAIL_MAILHEAD_HOST_TWEAK_CSS;
    case 'readMail':
      return HOME2_MAIL_READMAIL_HOST_TWEAK_CSS;
    case 'sendMail':
      return HOME2_MAIL_SENDMAIL_HOST_TWEAK_CSS;
    default:
      return null;
  }
}
