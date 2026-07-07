/**
 * ポータル URL からページ種別を判定するルーター（F-001）。
 */

import { PAGE, type PageType } from '../../contract/storage-keys';
import { PORTAL_HOSTNAME } from '../../contract/origins';

export interface PortalRoute {
  page:      PageType;
  detailId?: string;
}

/** 現在の URL がポータルオーバーレイを表示するパスか判定する */
export function matchPortalRoute(): PortalRoute | null {
  if (location.hostname !== PORTAL_HOSTNAME) return null;
  const path = location.pathname.replace(/\/+$/, '') || '/portal';

  if (path === '/portal')              return { page: PAGE.HOME };
  if (path === '/portal/News')         return { page: PAGE.NEWS };
  if (path === '/portal/KyukoHokoEtc') return { page: PAGE.KYUKO };
  if (path === '/portal/Questionnaire') return { page: PAGE.SURVEY };

  const detailM = path.match(/^\/portal\/News\/Detail\/([^/]+)$/);
  if (detailM) return { page: PAGE.DETAIL, detailId: detailM[1] };

  return null;
}
