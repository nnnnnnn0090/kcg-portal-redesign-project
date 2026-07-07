import { openPortalHome, openSettingsPanel } from '../support/flow-helpers';
import { readExtensionStorage, SK } from '../support/storage-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

test.describe('FL-02 theme change', () => {
  skipUnlessRealServerReady();

  test('settings → light theme → SK.theme saved', async ({ extensionHandle, worker }) => {
    test.setTimeout(180_000);
    const { page } = await openPortalHome(extensionHandle.context, { skipOnboarding: true });
    await openSettingsPanel(page);
    await page.locator('.p-theme-btn[data-theme="light"]').click();

    const storage = await readExtensionStorage(worker, [SK.theme]);
    expect(storage[SK.theme]).toBe('light');
  });
});
