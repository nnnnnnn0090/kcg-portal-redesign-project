/**
 * Home2 Web メールのホストページ用 CSS（レイアウト別）。オーバーレイ表示時に runtime CSS carrier へ渡す。
 */

import type { Home2MailLayout } from '../../domain/home2/router';

export const HOME2_MAIL_LOGIN_HOST_TWEAK_CSS = `
.page > div:first-of-type {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.page .main #divTitle,
.page .main #divLogin {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.page .main #MainContent_chkShowLastPage {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  opacity: 0;
  pointer-events: none;
}
.page .main > hr:first-of-type {
  visibility: hidden;
  height: 0;
  margin: 0;
  border: 0;
}
.page .footer {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
`;

export const HOME2_MAIL_MAILHEAD_HOST_TWEAK_CSS = `
.page > div:first-of-type {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.page .main > div:first-of-type {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
#MainContent_Table_HEAD,
#MainContent_Table1,
#MainContent_butLogout {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.page .footer {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
`;

export const HOME2_MAIL_SENDMAIL_HOST_TWEAK_CSS = `
.page > div:first-of-type {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
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
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.page .footer {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
`;

export const HOME2_MAIL_READMAIL_HOST_TWEAK_CSS = `
.page > div:first-of-type {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.page .main > div:first-of-type {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
#MainContent_Table1,
#MainContent_txtBody,
#MainContent_Table2,
#MainContent_ListBox1,
#MainContent_butBinFileSave,
#MainContent_butLogout {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.page .footer {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
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
