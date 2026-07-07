/**
 * オーバーレイ下部の「ページ末尾クローム」一式。
 * サイトフッター・カレンダー用アンカー DOM・FAB をこの順で並べ、`useCalendarInteractions` でツールチップ／コンテキストメニューを配線する。
 */

import { useCalendarInteractions } from '../../calendar';
import { Footer } from './Footer';
import { CalendarOverlayAnchors } from './CalendarOverlayAnchors';
import { OverlayPageEndFabCluster } from './OverlayPageEndFabCluster';

export interface PortalPageEndChromeProps {
  onShareClick: () => void;
  /** 「先頭へ」スクロールの対象（オーバーレイのスクロールルート vs ウィンドウ） */
  scrollTopScope: 'overlay' | 'window';
  /** ルート／レイアウトが変わるたびに更新し、カレンダー用リスナーを張り直す */
  calendarInteractionEpoch: string | number;
}

export function PortalPageEndChrome({
  onShareClick,
  scrollTopScope,
  calendarInteractionEpoch,
}: PortalPageEndChromeProps) {
  useCalendarInteractions(calendarInteractionEpoch);

  return (
    <>
      <Footer />
      <CalendarOverlayAnchors />
      <OverlayPageEndFabCluster onShareClick={onShareClick} scrollTopScope={scrollTopScope} />
    </>
  );
}
