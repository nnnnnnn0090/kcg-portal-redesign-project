import { EXTENSION_ENABLED_URL } from '../contract/origins';
import { KING_LMS_SYNC_DOM, PORTAL_DOM } from '../contract/dom';
import { removePortalBackdrop } from '../domain/themes';
import { teardownHome2Overlay } from './home2-host';

type ExtensionEnabledResponse = { enabled?: unknown };

/** Web のマスタースイッチ。取得失敗時は fail-open（従来どおり動作）。 */
export async function isExtensionOperationallyEnabled(): Promise<boolean> {
  try {
    const response = await fetch(EXTENSION_ENABLED_URL, { cache: 'no-store' });
    if (!response.ok) return true;
    const payload = (await response.json()) as ExtensionEnabledResponse;
    return payload.enabled !== false;
  } catch {
    return true;
  }
}

/** 拡張 UI / フックが差し込んだ DOM・背景を可能な限り除去する。 */
export function teardownExtensionUi(): void {
  removePortalBackdrop();
  teardownHome2Overlay();
  document.getElementById(PORTAL_DOM.bootCover)?.remove();
  document.getElementById(PORTAL_DOM.overlayRoot)?.remove();
  document.getElementById(KING_LMS_SYNC_DOM.overlay)?.remove();
  document.getElementById(KING_LMS_SYNC_DOM.style)?.remove();
  document.documentElement.classList.remove('kcg-portal-surface');
  document.body?.classList.remove('kcg-portal-surface');
  document.documentElement.classList.remove(KING_LMS_SYNC_DOM.scrollLockClass);
  delete document.documentElement.dataset.cplanOverlayDisabled;
}

/** 無効時は UI を片付けて false。有効時は true。 */
export async function ensureExtensionOperationallyEnabled(): Promise<boolean> {
  const enabled = await isExtensionOperationallyEnabled();
  if (!enabled) teardownExtensionUi();
  return enabled;
}
