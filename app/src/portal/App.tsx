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
import { EXTENSION_PROMO_PAGE_URL } from '../shared/constants';
import { useCalendarInteractions } from '../features/calendar';
import type { PortalRoute } from './router';
import { PortalPageOutlet } from './routes';
import { AppProviders } from './providers';

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
  const { settingsPopRef } = usePortalDom();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsPanelRef = useRef<SettingsPanelHandle | null>(null);
  const { toast, show: showToast, onAnimationEnd } = useToast();

  // King LMS 同期完了トーストを初回のみ表示
  useEffect(() => {
    if (syncToastMsg) showToast(syncToastMsg, { placement: 'top' });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- syncToastMsg はマウント時の初期値のみ使う。再レンダーのたびに表示するのは意図しない動作のため deps から意図的に除外。
  }, []);

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
          />
        )}
      />

      <PortalPageOutlet route={route} settings={settings} />

      <Footer onShareClick={handleShareClick} />
      <Toast toast={toast} onAnimationEnd={onAnimationEnd} />
    </>
  );
}
