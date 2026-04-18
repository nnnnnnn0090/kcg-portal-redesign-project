/**
 * ポータルオーバーレイのアプリケーションルート。
 * ヘッダー・フッター・ページアウトレット・カレンダーインタラクションを統合する。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from '../context/settings';
import { usePortalDom } from '../context/portalDom';
import { useToast, Toast, copyToClipboard } from '../components/ui/Toast';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { SettingsPanel, type SettingsPanelHandle } from '../components/layout/SettingsPanel';
import { EXTENSION_PROMO_PAGE_URL, PAGE, PORTAL_ORIGIN, SK } from '../shared/constants';
import storage from '../lib/storage';
import { consumeExtensionUpdateToastMessage } from '../lib/extension-update-notice';
import { useCalendarInteractions } from '../features/calendar';
import type { PortalRoute } from './router';
import type { PortalAppRoute, PortalSurface } from './app-types';
import { isHome2MailRoute } from './app-types';
import { PortalPageOutlet } from './routes';
import { AppProviders } from './providers';
import { GuidedTour } from '../components/ui/GuidedTour';

// ─── 型 ───────────────────────────────────────────────────────────────────

export interface PortalAppProps {
  surface: PortalSurface;
  route:   PortalAppRoute;
  /** King LMS 同期完了トースト（ポータルのみ） */
  syncToastMsg: string;
  /** コンテンツスクリプトが作成した #portal-overlay 要素（スクロール・イベント委譲の基点） */
  overlayRoot: HTMLElement;
}

// ─── エントリポイント（Provider ラッパー） ─────────────────────────────────

/** entrypoint からマウントするルートコンポーネント */
export function PortalApp(props: PortalAppProps) {
  return (
    <AppProviders overlayRoot={props.overlayRoot}>
      <PortalAppShell {...props} />
    </AppProviders>
  );
}

// ─── アプリシェル ─────────────────────────────────────────────────────────

function PortalAppShell({ surface, route, syncToastMsg }: PortalAppProps) {
  const { settings, settingsReady, updateSetting, updateTheme } = useSettings();
  const { settingsPopRef, overlayRoot } = usePortalDom();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guidedTourReplayToken, setGuidedTourReplayToken] = useState(0);
  const settingsPanelRef = useRef<SettingsPanelHandle | null>(null);
  const { toast, show: showToast, onAnimationEnd } = useToast();

  const portalRoute = surface === 'portal' ? (route as PortalRoute) : null;

  const showFullChrome = surface === 'portal'
    || (isHome2MailRoute(route) && (route.layout === 'full' || route.layout === 'mailHead' || route.layout === 'readMail' || route.layout === 'sendMail'));

  const footerScrollTarget = surface === 'home2-mail'
    && isHome2MailRoute(route)
    && route.layout === 'headerOnly'
    ? 'window' as const
    : 'overlay' as const;

  const handleReplayGuidedTour = useCallback(() => {
    if (!portalRoute) return;
    settingsPanelRef.current?.requestClose();
    overlayRoot.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    void storage.set({ [SK.portalGuidedTourDone]: false }).then(() => {
      if (portalRoute.page !== PAGE.HOME) {
        window.location.assign(`${PORTAL_ORIGIN}/portal/`);
        return;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setGuidedTourReplayToken((n) => n + 1);
        });
      });
    });
  }, [portalRoute, overlayRoot]);

  // King LMS 同期完了トースト（親から渡された初回メッセージのみ）
  useEffect(() => {
    if (!syncToastMsg) return;
    showToast(syncToastMsg, {
      placement: 'top',
      durationMs: syncToastMsg.length > 48 ? 5800 : undefined,
    });
  }, [syncToastMsg, showToast]);

  // 拡張機能の manifest バージョンが上がったときのトースト（同一タブ・同一メッセージは一度だけ）
  useEffect(() => {
    if (!settingsReady) return;
    void consumeExtensionUpdateToastMessage().then((msg) => {
      if (!msg) return;
      const mark = `kcg-portal-ext-up-toast:${msg}`;
      try {
        if (sessionStorage.getItem(mark)) return;
        sessionStorage.setItem(mark, '1');
      } catch {
        /* ストレージ不可時はそのまま表示 */
      }
      showToast(msg, { placement: 'top', durationMs: 5200 });
    });
  }, [settingsReady, showToast]);

  // カレンダーの tooltip / コンテキストメニューをオーバーレイに配線
  useCalendarInteractions();

  // 拡張機能紹介 URL のコピー
  const handleShareClick = useCallback(async () => {
    const ok = await copyToClipboard(EXTENSION_PROMO_PAGE_URL);
    showToast(ok ? 'URLをコピーしました' : 'コピーに失敗しました（手動でコピーしてください）');
  }, [showToast]);

  // 設定パネルのトグル（開いている場合は閉じるアニメを先に実行）
  const toggleSettings = useCallback(() => {
    setSettingsOpen((wasOpen) => {
      if (wasOpen) {
        settingsPanelRef.current?.requestClose();
        return wasOpen; // 閉じアニメ完了後に onClose → setSettingsOpen(false) が走る
      }
      return true;
    });
  }, []);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const settingsVariant = surface === 'home2-mail' ? 'home2' : 'portal';

  return (
    <>
      <Header
        navSource={surface === 'home2-mail' ? 'home2-mail' : 'portal'}
        settings={settings}
        settingsReady={settingsReady}
        settingsOpen={settingsOpen}
        onSettingsToggle={toggleSettings}
        settingsPopover={(
          <SettingsPanel
            ref={settingsPanelRef}
            popoverSurfaceRef={settingsPopRef}
            isOpen={settingsOpen}
            settings={settings}
            variant={settingsVariant}
            onClose={closeSettings}
            onThemeChange={updateTheme}
            onSettingChange={updateSetting}
            onReplayGuidedTour={handleReplayGuidedTour}
          />
        )}
      />

      <PortalPageOutlet route={route} settings={settings} />

      {showFullChrome ? (
        <Footer onShareClick={handleShareClick} scrollTarget={footerScrollTarget} />
      ) : null}

      {surface === 'portal' && portalRoute ? (
        <GuidedTour
          route={portalRoute}
          settingsReady={settingsReady}
          guidedTourReplayToken={guidedTourReplayToken}
        />
      ) : null}
      <Toast toast={toast} onAnimationEnd={onAnimationEnd} />
    </>
  );
}
