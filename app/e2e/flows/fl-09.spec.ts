import { acquireTestPage } from '../support/shared-extension';
import { ensureHome2MailLoggedIn } from '../support/home2-auth';
import { seedOnboardingDone } from '../support/flow-helpers';
import { SK, writeExtensionStorage } from '../support/storage-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

test.describe('FL-09 Home2 mail send', () => {
  skipUnlessRealServerReady();

  test('compose form renders on real Home2', async ({ extensionHandle, worker }) => {
    test.setTimeout(180_000);
    await seedOnboardingDone(worker);
    await writeExtensionStorage(worker, {
      [SK.home2WebMailOverlay]: true,
      [SK.theme]: 'dark',
    });

    const page = await acquireTestPage(extensionHandle.context);
    await page.goto('https://home2.kcg.ac.jp/Mail/Default.aspx', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await ensureHome2MailLoggedIn(page);
    await page.goto('https://home2.kcg.ac.jp/Mail/SendMail.aspx', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#p-home2-mail-send')).toBeVisible({ timeout: 120_000 });
  });
});
