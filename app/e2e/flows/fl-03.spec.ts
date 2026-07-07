import { openPortalHome, openSettingsPanel } from '../support/flow-helpers';
import { openThemeStudio } from '../support/real-server-helpers';
import { readExtensionStorage, SK, writeExtensionStorage } from '../support/storage-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

test.describe('FL-03 custom theme', () => {
  skipUnlessRealServerReady();

  test('theme studio save → delete → theme resets to dark', async ({ extensionHandle, worker }) => {
    test.setTimeout(180_000);
    await writeExtensionStorage(worker, { [SK.theme]: 'dark' });
    const { page } = await openPortalHome(extensionHandle.context, { skipOnboarding: true });
    await openThemeStudio(page);
    await page.locator('#p-theme-studio-root input').first().fill('E2E Custom');
    await page.getByRole('button', { name: /保存して使用|Save and use/ }).click();
    await expect(page.locator('#p-theme-studio-root')).toHaveCount(0, { timeout: 10_000 });

    let storage = await readExtensionStorage(worker, [SK.theme, SK.customThemes]);
    expect(String(storage[SK.theme] ?? '')).toMatch(/^custom:/);
    const customThemes = storage[SK.customThemes] as { themes?: Array<{ id: string }> } | undefined;
    expect(customThemes?.themes?.length).toBeGreaterThan(0);

    await openSettingsPanel(page);
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.p-theme-custom-actions button', { hasText: /削除|Delete/ }).click();

    storage = await readExtensionStorage(worker, [SK.theme, SK.customThemes]);
    expect(storage[SK.theme]).toBe('dark');
  });
});
