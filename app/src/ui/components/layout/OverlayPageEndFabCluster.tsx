/**
 * オーバーレイ末尾の FAB（拡張紹介 URL コピー・先頭へスクロール）。
 * Home2 Mail のヘッダー帯のみ表示時は `scrollTopScope="window"` でホストページをスクロールする。
 */

import { EXTENSION_PROMO_PAGE_URL } from '../../../shared/constants';
import { usePortalDom } from '../../../context/portalDom';
import { useI18n } from '../../../i18n';

export interface OverlayPageEndFabClusterProps {
  onShareClick: () => void;
  /** 「先頭へ」のスクロール先。Home2 Mail ヘッダー帯のみのときは `window` でホストページをスクロールする */
  scrollTopScope?: 'overlay' | 'window';
}

export function OverlayPageEndFabCluster({
  onShareClick,
  scrollTopScope = 'overlay',
}: OverlayPageEndFabClusterProps) {
  const { t } = useI18n();
  const { overlayRoot } = usePortalDom();

  function scrollTop() {
    if (scrollTopScope === 'window') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    overlayRoot.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="p-fab-cluster" role="group" aria-label={t.fab.group}>
      <button
        type="button"
        className="p-share-ext-btn"
        id="p-share-extension"
        aria-label={t.fab.shareAria}
        title={t.fab.shareTitle(EXTENSION_PROMO_PAGE_URL)}
        onClick={onShareClick}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span>{t.fab.share}</span>
      </button>
      <button
        type="button"
        className="p-scroll-top-btn"
        aria-label={t.fab.pageTop}
        title={t.fab.pageTop}
        onClick={scrollTop}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  );
}
