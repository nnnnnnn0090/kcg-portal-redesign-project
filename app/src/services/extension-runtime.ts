import { EXTENSION_ENABLED_URL } from '../contract/origins';
import { KING_LMS_SYNC_DOM, PORTAL_DOM } from '../contract/dom';
import { removePortalBackdrop } from '../domain/themes';
import { teardownHome2Overlay } from './home2-host';

type ExtensionEnabledResponse = { enabled?: unknown };

/** サーバー kill switch 検知後、同一タブで拡張を止める sessionStorage キー */
const REMOTE_KILL_SWITCH_SESSION_KEY = 'kcgExtensionRemoteDisabled';
const OPERATIONAL_WATCH_DATASET_KEY = 'kcgExtRuntimeWatch';

function readRemoteKillSwitchFlag(): boolean {
  try {
    return sessionStorage.getItem(REMOTE_KILL_SWITCH_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function writeRemoteKillSwitchFlag(blocked: boolean): void {
  try {
    if (blocked) sessionStorage.setItem(REMOTE_KILL_SWITCH_SESSION_KEY, '1');
    else sessionStorage.removeItem(REMOTE_KILL_SWITCH_SESSION_KEY);
  } catch {
    // sessionStorage 不可時は fail-open のまま
  }
}

/** 直前の kill switch リロード後、拡張を起動しない */
export function isExtensionBlockedByRemoteKillSwitch(): boolean {
  return readRemoteKillSwitchFlag();
}

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

/**
 * kill switch を非同期で確認する。ブートは待たない。
 * OFF 検知時は sessionStorage に記録してリロード（次回以降は拡張を差し込まない）。
 * ブロック中に ON に戻ったらフラグを消してリロードする。
 */
export function startExtensionOperationalWatch(): void {
  if (document.documentElement.dataset[OPERATIONAL_WATCH_DATASET_KEY]) return;
  document.documentElement.dataset[OPERATIONAL_WATCH_DATASET_KEY] = '1';

  void (async () => {
    const enabled = await isExtensionOperationallyEnabled();
    if (!enabled) {
      if (!readRemoteKillSwitchFlag()) {
        writeRemoteKillSwitchFlag(true);
        location.reload();
      }
      return;
    }
    if (readRemoteKillSwitchFlag()) {
      writeRemoteKillSwitchFlag(false);
      location.reload();
    }
  })();
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
