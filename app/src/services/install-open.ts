import { PORTAL_ORIGIN } from '../contract/origins';
import { INSTALL_OPEN_PENDING_KEY } from '../contract/storage-keys';
import { storageRepo } from '../platform/storage/repo';

const PORTAL_HOME_URL = `${PORTAL_ORIGIN}/portal/`;

let openingPortal = false;

function isPortalTab(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === PORTAL_ORIGIN && /^\/portal(?:\/|$)/.test(parsed.pathname);
  } catch {
    return false;
  }
}

async function openOrReloadPortal(): Promise<void> {
  const tabs = await browser.tabs.query({});
  const existingTab = tabs.find((tab) => tab.id !== undefined && isPortalTab(tab.url));

  if (existingTab?.id !== undefined) {
    try {
      await browser.tabs.reload(existingTab.id, { bypassCache: true });
      await browser.tabs.update(existingTab.id, { active: true }).catch(() => undefined);
      return;
    } catch {
      // タブが検索直後に閉じられた場合などは、新規作成へフォールバックする。
    }
  }

  await browser.tabs.create({ url: PORTAL_HOME_URL });
}

export async function completePendingPortalOpen(): Promise<void> {
  if (openingPortal) return;
  openingPortal = true;
  try {
    const pending = await storageRepo.getInstallOpenPending();
    if (!pending) return;
    await openOrReloadPortal();
    await storageRepo.clearInstallOpenPending();
  } catch (error) {
    console.warn('Failed to open the portal after installation; retrying on startup.', error);
  } finally {
    openingPortal = false;
  }
}

export function registerInstallOpenHandlers(): void {
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason !== 'install') return;
    void storageRepo
      .setInstallOpenPending(true)
      .then(completePendingPortalOpen)
      .catch(() => openOrReloadPortal());
  });

  browser.runtime.onStartup.addListener(() => {
    void completePendingPortalOpen();
  });
}

export { INSTALL_OPEN_PENDING_KEY };
