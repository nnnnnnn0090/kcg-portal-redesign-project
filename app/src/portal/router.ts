/**
 * ポータル URL からページ種別を判定するルーター。
 * マウント対象でないページでは null を返し、拡張を起動しない。
 */

import { PAGE, type PageType } from '../shared/constants';

export interface PortalRoute {
  page:      PageType;
  detailId?: string;
}

/** 現在の URL がポータルオーバーレイを表示するパスか判定する */
export function matchPortalRoute(): PortalRoute | null {
  if (location.hostname !== 'home.kcg.ac.jp') return null;
  const path = location.pathname.replace(/\/+$/, '') || '/portal';

  if (path === '/portal')              return { page: PAGE.HOME };
  if (path === '/portal/News')         return { page: PAGE.NEWS };
  if (path === '/portal/KyukoHokoEtc') return { page: PAGE.KYUKO };
  if (path === '/portal/Questionnaire') return { page: PAGE.SURVEY };

  const detailM = path.match(/^\/portal\/News\/Detail\/([^/]+)$/);
  if (detailM) return { page: PAGE.DETAIL, detailId: detailM[1] };

  return null;
}
