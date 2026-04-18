/** Home2 Web メール `/Mail` 配下のオーバーレイ表示モード（Default / mailhead / readmail / sendmail / その他） */

import { HOME2_HOSTNAME } from '../shared/constants';

export type Home2MailLayout = 'full' | 'mailHead' | 'readMail' | 'sendMail' | 'headerOnly';

export interface Home2MailRoute {
  kind:   'home2-mail';
  layout: Home2MailLayout;
}

export function isHome2MailRoute(r: unknown): r is Home2MailRoute {
  return typeof r === 'object' && r !== null && (r as Home2MailRoute).kind === 'home2-mail';
}

function pathEndsWithDefaultAspx(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return /\/mail\/default\.aspx$/i.test(p);
}

function pathEndsWithMailheadAspx(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return /\/mail\/mailhead\.aspx$/i.test(p);
}

function pathEndsWithReadmailAspx(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return /\/mail\/readmail\.aspx$/i.test(p);
}

function pathEndsWithSendmailAspx(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return /\/mail\/sendmail\.aspx$/i.test(p);
}

export function matchHome2MailRoute(): Home2MailRoute | null {
  if (location.hostname !== HOME2_HOSTNAME) return null;
  const path = (location.pathname || '/').replace(/\/+$/, '') || '/';
  const pathLower = path.toLowerCase();
  if (pathLower !== '/mail' && !pathLower.startsWith('/mail/')) return null;
  if (pathLower === '/mail' || pathEndsWithDefaultAspx(path)) {
    return { kind: 'home2-mail', layout: 'full' };
  }
  if (pathEndsWithMailheadAspx(path)) {
    return { kind: 'home2-mail', layout: 'mailHead' };
  }
  if (pathEndsWithReadmailAspx(path)) {
    return { kind: 'home2-mail', layout: 'readMail' };
  }
  if (pathEndsWithSendmailAspx(path)) {
    return { kind: 'home2-mail', layout: 'sendMail' };
  }
  return { kind: 'home2-mail', layout: 'headerOnly' };
}
