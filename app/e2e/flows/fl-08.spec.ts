import { openPortalHome } from '../support/flow-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

test.describe('FL-08 shortcut editing', () => {
  skipUnlessRealServerReady();

  test('edit mode → add custom link → shows on home', async ({ extensionHandle }) => {
    test.setTimeout(180_000);
    const linkLabel = `E2E Link ${Date.now().toString(36)}`;
    const linkUrl = `https://example.com/e2e-${Date.now().toString(36)}`;
    const { page } = await openPortalHome(extensionHandle.context, { skipOnboarding: true });
    await page.locator('#p-link-edit-btn').click();
    await expect(page.locator('.p-link-add-form')).toBeVisible();

    await page.locator('.p-link-add-input').first().fill(linkLabel);
    await page.locator('.p-link-add-input').nth(1).fill(linkUrl);
    await page.locator('.p-link-add-btn').click();
    await expect(page.locator('.p-link-edit-name', { hasText: linkLabel }).first()).toBeVisible();

    await page.locator('#p-link-edit-btn').click();
    await expect(page.locator('.p-shortcut-title', { hasText: linkLabel }).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
