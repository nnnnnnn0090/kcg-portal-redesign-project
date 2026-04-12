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
import { useCalendarInteractions } from '../features/calendar';
import type { PortalRoute } from './router';
import { PortalPageOutlet } from './routes';
import { AppProviders } from './providers';
import { GuidedTour } from '../components/ui/GuidedTour';

// ─── 型 ───────────────────────────────────────────────────────────────────

export interface PortalAppProps {
  route:        PortalRoute;
  syncToastMsg: string;
  /** portal.content が作成した #portal-overlay 要素（スクロール・イベント委譲の基点） */
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

function PortalAppShell({ route, syncToastMsg }: PortalAppProps) {
  const { settings, settingsReady, updateSetting, updateTheme } = useSettings();
  const { settingsPopRef, overlayRoot } = usePortalDom();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guidedTourReplayToken, setGuidedTourReplayToken] = useState(0);
  const settingsPanelRef = useRef<SettingsPanelHandle | null>(null);
  const { toast, show: showToast, onAnimationEnd } = useToast();

  const handleReplayGuidedTour = useCallback(() => {
    settingsPanelRef.current?.requestClose();
    overlayRoot.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    void storage.set({ [SK.portalGuidedTourDone]: false }).then(() => {
      if (route.page !== PAGE.HOME) {
        window.location.assign(`${PORTAL_ORIGIN}/portal/`);
        return;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setGuidedTourReplayToken((n) => n + 1);
        });
      });
    });
  }, [route.page, overlayRoot]);

  // King LMS 同期完了トースト（親から渡された初回メッセージのみ）
  useEffect(() => {
    if (!syncToastMsg) return;
    showToast(syncToastMsg, {
      placement: 'top',
      durationMs: syncToastMsg.length > 48 ? 5800 : undefined,
    });
  }, [syncToastMsg, showToast]);

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

  return (
    <>
      <Header
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
            onClose={closeSettings}
            onThemeChange={updateTheme}
            onSettingChange={updateSetting}
            onReplayGuidedTour={handleReplayGuidedTour}
          />
        )}
      />

      <PortalPageOutlet route={route} settings={settings} />

      <Footer onShareClick={handleShareClick} />
      <GuidedTour
        route={route}
        settingsReady={settingsReady}
        guidedTourReplayToken={guidedTourReplayToken}
      />
      <Toast toast={toast} onAnimationEnd={onAnimationEnd} />
    </>
  );
}
