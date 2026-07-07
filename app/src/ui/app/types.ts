/**
 * `PortalApp` に渡すルート判別結果の和型です（学ポータル本体と Home2 Web メール）。
 */

import type { PortalRoute } from '../../domain/portal/router';
import type { Home2MailRoute } from '../../domain/home2/router';

export type PortalSurface = 'portal' | 'home2-mail';

export type PortalAppRoute = PortalRoute | Home2MailRoute;

export { isHome2MailRoute } from '../../domain/home2/router';
