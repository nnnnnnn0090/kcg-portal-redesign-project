import { acquireTestPage } from '../support/shared-extension';
import { waitForExtensionServiceWorker } from '../support/extension-context';
import { ensurePortalLoggedIn } from '../support/portal-auth';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

const CPLAN_ATTENDANCE_URL =
  'https://home.kcg.ac.jp/gakusei/web/skt/WebSktGakuseiShukketsuShinsei/UI/WSK_GakuseiShukketsuShinsei.aspx';

test.describe('FL-10 Cplan attendance', () => {
  skipUnlessRealServerReady();

  test('attendance snapshot renders overlay table', async ({ extensionHandle }) => {
    test.setTimeout(180_000);
    await waitForExtensionServiceWorker(extensionHandle.context);
    const page = await acquireTestPage(extensionHandle.context);
    await page.goto(CPLAN_ATTENDANCE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await ensurePortalLoggedIn(page);
    await expect(page.locator('#portal-overlay.p-surface-cplan')).toBeAttached({
      timeout: 120_000,
    });
  });
});
