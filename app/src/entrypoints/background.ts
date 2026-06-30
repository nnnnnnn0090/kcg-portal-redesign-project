import { PORTAL_ORIGIN } from '../shared/constants';

const PORTAL_HOME_URL = `${PORTAL_ORIGIN}/portal/`;

async function openOrReloadPortal(): Promise<void> {
  const portalTabs = await browser.tabs.query({ url: `${PORTAL_ORIGIN}/portal*` });
  const existingTab = portalTabs.find((tab) => tab.id !== undefined);

  if (existingTab?.id !== undefined) {
    await browser.tabs.reload(existingTab.id, { bypassCache: true });
    await browser.tabs.update(existingTab.id, { active: true });
    return;
  }

  await browser.tabs.create({ url: PORTAL_HOME_URL });
}

/** 初回インストール時だけ、オンボーディングを開始する学生ポータルを開く。 */
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason !== 'install') return;
    void openOrReloadPortal();
  });
});
