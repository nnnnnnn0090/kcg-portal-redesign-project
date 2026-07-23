import { PORTAL_HOME_URL, seedOnboardingDone, waitForPortalOverlay } from '../support/flow-helpers';
import { acquireTestPage } from '../support/shared-extension';
import { readExtensionStorage, SK, writeExtensionStorage } from '../support/storage-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

test.describe('FL-13 extension update', () => {
  skipUnlessRealServerReady();

  test('version bump → update toast + extensionVersionSeen', async ({ extensionHandle, worker }) => {
    test.setTimeout(180_000);
    await seedOnboardingDone(worker);
    await writeExtensionStorage(worker, { [SK.extensionVersionSeen]: '6.2.5' });

    const page = await acquireTestPage(extensionHandle.context);
    await page.goto(PORTAL_HOME_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await waitForPortalOverlay(page);
    await expect(page.locator('#p-toast')).toBeVisible({ timeout: 60_000 });

    const storage = await readExtensionStorage(worker, [SK.extensionVersionSeen]);
    expect(storage[SK.extensionVersionSeen]).toBe('7.1.1');
  });
});
