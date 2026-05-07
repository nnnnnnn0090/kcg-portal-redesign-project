/**
 * `PortalApp` に渡すルート判別結果の和型です（学ポータル本体と Home2 Web メール）。
 */

import type { PortalRoute } from './router';
import type { Home2MailRoute } from './home2-mail-router';

export type PortalSurface = 'portal' | 'home2-mail';

export type PortalAppRoute = PortalRoute | Home2MailRoute;

export { isHome2MailRoute } from './home2-mail-router';
