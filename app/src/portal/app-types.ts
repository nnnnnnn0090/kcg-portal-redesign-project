/** portal / home2-mail の `PortalApp` 用ルート型 */

import type { PortalRoute } from './router';
import type { Home2MailRoute } from './home2-mail-router';

export type PortalSurface = 'portal' | 'home2-mail';

export type PortalAppRoute = PortalRoute | Home2MailRoute;

export { isHome2MailRoute } from './home2-mail-router';
