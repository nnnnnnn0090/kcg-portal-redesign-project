import { expect, type BrowserContext, type Page, type Worker } from '@playwright/test';
import {
  extensionBuildReady,
  PORTAL_HOME_URL,
  waitForExtensionServiceWorker,
} from './extension-context';
import { acquireTestPage } from './shared-extension';
import { ensurePortalLoggedIn } from './portal-auth';
import { readExtensionStorage, SK, writeExtensionStorage } from './storage-helpers';

export { extensionBuildReady, PORTAL_HOME_URL, waitForExtensionServiceWorker };

export async function waitForPortalOverlay(page: Page): Promise<void> {
  await ensurePortalLoggedIn(page);
  await expect(page.locator('#portal-overlay')).toBeAttached({ timeout: 60_000 });
}

export async function waitForLanguagePicker(page: Page): Promise<void> {
  await expect(page.locator('#p-lang-picker-title')).toBeVisible({ timeout: 60_000 });
}

export async function confirmLanguagePicker(page: Page): Promise<void> {
  await page.locator('.p-lang-picker-continue').click();
  await expect(page.locator('#p-lang-picker-title')).toBeHidden({ timeout: 10_000 });
}

export async function skipGuidedTour(page: Page): Promise<void> {
  await expect(page.locator('.p-tour-root')).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.p-tour-root')).toHaveCount(0, { timeout: 15_000 });
}

export async function completePortalOnboarding(page: Page): Promise<void> {
  await waitForPortalOverlay(page);
  await waitForLanguagePicker(page);
  await confirmLanguagePicker(page);
  await skipGuidedTour(page);
}

export async function seedOnboardingDone(worker: Worker, language = 'ja'): Promise<void> {
  await writeExtensionStorage(worker, {
    [SK.language]: language,
    [SK.portalLanguagePickerDone]: true,
    [SK.portalGuidedTourDone]: true,
  });
}

export async function openPortalHome(
  context: BrowserContext,
  options?: { skipOnboarding?: boolean },
): Promise<{ page: Page; worker: Worker }> {
  const worker = await waitForExtensionServiceWorker(context);
  if (options?.skipOnboarding) {
    await seedOnboardingDone(worker);
  }
  const page = await acquireTestPage(context);
  await page.goto(PORTAL_HOME_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });
  if (options?.skipOnboarding) {
    await waitForPortalOverlay(page);
  } else {
    await completePortalOnboarding(page);
  }
  return { page, worker };
}

export async function openSettingsPanel(page: Page): Promise<void> {
  await page.locator('#p-open-settings').click();
  await expect(page.locator('#p-settings-pop')).toBeVisible({ timeout: 10_000 });
}

export async function waitForFontsReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

export async function expectStorageKeys(
  worker: Worker,
  keys: string[],
  assert: (storage: Record<string, unknown>) => void,
): Promise<void> {
  const storage = await readExtensionStorage(worker, keys);
  assert(storage);
}
