/**
 * ルートに応じたページコンポーネントを返すアウトレット。
 * ホーム以外は遅延ロードして初期バンドルサイズを削減する。
 */

import { lazy, Suspense } from 'react';
import { PAGE } from '../shared/constants';
import type { PortalRoute } from './router';
import type { Settings } from '../context/settings';
import { PageShell } from '../components/layout/PageShell';
import { HomePage } from '../components/pages/HomePage';

// 遅延ロード（ホームページ以外）
const NewsPage = lazy(() =>
  import('../components/pages/NewsPage').then((m) => ({ default: m.NewsPage })),
);
const DetailPage = lazy(() =>
  import('../components/pages/DetailPage').then((m) => ({ default: m.DetailPage })),
);
const KyukoPage = lazy(() =>
  import('../components/pages/KyukoPage').then((m) => ({ default: m.KyukoPage })),
);
const SurveyPage = lazy(() =>
  import('../components/pages/SurveyPage').then((m) => ({ default: m.SurveyPage })),
);

const PageFallback = (
  <PageShell hideHead>
    <p className="p-empty">読み込み中…</p>
  </PageShell>
);

/** ルートに応じたページコンポーネント。レイアウトは App が担当する。 */
export function PortalPageOutlet({ route, settings }: { route: PortalRoute; settings: Settings }) {
  switch (route.page) {
    case PAGE.HOME:
      return <HomePage settings={settings} />;
    case PAGE.NEWS:
      return <Suspense fallback={PageFallback}><NewsPage kinoForce={settings.kinoEmptyForce} /></Suspense>;
    case PAGE.DETAIL:
      return <Suspense fallback={PageFallback}><DetailPage newsDetailId={route.detailId ?? ''} /></Suspense>;
    case PAGE.KYUKO:
      return <Suspense fallback={PageFallback}><KyukoPage kinoForce={settings.kinoEmptyForce} /></Suspense>;
    case PAGE.SURVEY:
      return <Suspense fallback={PageFallback}><SurveyPage kinoForce={settings.kinoEmptyForce} /></Suspense>;
    default:
      return null;
  }
}
