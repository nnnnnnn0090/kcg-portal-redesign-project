/**
 * portal.content — React アプリのマウントエントリポイント（隔離ワールド、document_end）
 *
 * 1. ルート判定 → 対象外なら起動カバーだけ外して終了
 * 2. King LMS 同期ハッシュを消費
 * 3. <head> を整理し、テーマ用 <style> とオーバーレイ用 <style>（Vite ?inline でバンドル）を注入
 * 4. #portal-overlay に React をマウント
 * 5. 数フレーム後に起動カバーを外す
 */

import { createElement } from 'react';
import overlayCss from '../../styles/overlay.css?inline';
import { matchPortalRoute } from '../../portal/router';
import {
  consumeKingLmsSyncReturnHash,
  KING_LMS_COURSE_LIST_SYNC_SUCCESS_GUIDE_TOAST,
} from '../../portal/sync-hash';
import { applyThemeToElement, portalHeadThemeCssByName, themeTokensForName } from '../../themes';
import storage from '../../lib/storage';
import { SK } from '../../shared/constants';

function removeBootCoverAfterFrames(frameCount: number): void {
  if (frameCount <= 0) {
    document.getElementById('kcg-portal-boot-cover')?.remove();
    return;
  }
  requestAnimationFrame(() => removeBootCoverAfterFrames(frameCount - 1));
}

export default defineContentScript({
  matches: ['https://home.kcg.ac.jp/portal*'],
  runAt: 'document_end',

  main() {
    const route = matchPortalRoute();
    if (!route) {
      document.getElementById('kcg-portal-boot-cover')?.remove();
      return;
    }

    void (async () => {
      try {
        let syncToastMsg = consumeKingLmsSyncReturnHash();
        const bootSnap = await storage.get([SK.theme, SK.kingLmsCourseSyncToastQuiet]);
        if (bootSnap[SK.kingLmsCourseSyncToastQuiet]) {
          await storage.set({ [SK.kingLmsCourseSyncToastQuiet]: false });
          if (syncToastMsg === KING_LMS_COURSE_LIST_SYNC_SUCCESS_GUIDE_TOAST) {
            syncToastMsg = 'コース一覧を保存しました';
          }
        }

        const themeName = String(bootSnap[SK.theme] ?? '').trim() || 'dark';

        const preservedTheme = document.getElementById('portal-theme-vars')?.textContent ?? '';
        const title = document.querySelector('title')?.cloneNode(true) ?? null;
        document.head.replaceChildren();
        if (title) document.head.appendChild(title);

        const themeStyle = document.createElement('style');
        themeStyle.id = 'portal-theme-vars';
        themeStyle.textContent = preservedTheme || portalHeadThemeCssByName(themeName);
        document.head.appendChild(themeStyle);

        const overlayStyle = document.createElement('style');
        overlayStyle.id = 'portal-overlay-css';
        overlayStyle.textContent = overlayCss;
        document.head.appendChild(overlayStyle);

        const overlay = document.createElement('div');
        overlay.id = 'portal-overlay';
        document.body.appendChild(overlay);

        applyThemeToElement(overlay, themeTokensForName(themeName));

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        const [{ createRoot }, { PortalApp }] = await Promise.all([
          import('react-dom/client'),
          import('../../portal/App'),
        ]);
        const root = createRoot(overlay);
        root.render(createElement(PortalApp, { route, syncToastMsg, overlayRoot: overlay }));

        const coverFrames = syncToastMsg ? 5 : 3;
        removeBootCoverAfterFrames(coverFrames);
      } catch {
        document.getElementById('kcg-portal-boot-cover')?.remove();
      }
    })();
  },
});
