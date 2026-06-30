import { PORTAL_ORIGIN } from '../shared/constants';

const PORTAL_HOME_URL = `${PORTAL_ORIGIN}/portal/`;
const INSTALL_OPEN_PENDING_KEY = 'portalInstallOpenPending';

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

async function completePendingPortalOpen(): Promise<void> {
  if (openingPortal) return;
  openingPortal = true;
  try {
    const state = await browser.storage.local.get(INSTALL_OPEN_PENDING_KEY);
    if (state[INSTALL_OPEN_PENDING_KEY] !== true) return;
    await openOrReloadPortal();
    await browser.storage.local.remove(INSTALL_OPEN_PENDING_KEY);
  } catch (error) {
    console.warn('Failed to open the portal after installation; retrying on startup.', error);
  } finally {
    openingPortal = false;
  }
}

/** 初回インストール時だけ、オンボーディングを開始する学生ポータルを開く。 */
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason !== 'install') return;
    void browser.storage.local
      .set({ [INSTALL_OPEN_PENDING_KEY]: true })
      .then(completePendingPortalOpen)
      .catch(() => openOrReloadPortal());
  });

  browser.runtime.onStartup.addListener(() => {
    void completePendingPortalOpen();
  });
});
