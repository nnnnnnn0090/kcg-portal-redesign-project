import { openPortalHome } from '../support/flow-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

test.describe('FL-07 news browsing', () => {
  skipUnlessRealServerReady();

  test('news list → detail opens', async ({ extensionHandle }) => {
    test.setTimeout(180_000);
    const { page } = await openPortalHome(extensionHandle.context, { skipOnboarding: true });
    await page.goto('https://home.kcg.ac.jp/portal/News', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expect(page.locator('#p-news-page-list')).toBeVisible({ timeout: 60_000 });
    const firstLink = page.locator('.p-news-link').first();
    await expect(firstLink).toBeVisible({ timeout: 60_000 });
    await firstLink.click();
    await page.waitForURL(/\/portal\/News\/Detail\//, { timeout: 60_000 });
    await expect(page.locator('.p-news-detail-title')).not.toBeEmpty({ timeout: 30_000 });
  });
});
