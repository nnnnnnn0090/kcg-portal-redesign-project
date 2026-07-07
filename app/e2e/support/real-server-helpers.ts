import { expect, type BrowserContext, type Page } from '@playwright/test';
import { SK, writeExtensionStorage } from './storage-helpers';
import type { Worker } from '@playwright/test';

import { DEFAULT_COMMUNITY_E2E_ORIGIN } from './community-server';

const COMMUNITY_ACCESS_PATH = '/community-access';

export function communityApiOriginOverride(): string | null {
  const origin = process.env.COMMUNITY_E2E_API_ORIGIN?.trim();
  return origin || DEFAULT_COMMUNITY_E2E_ORIGIN;
}

/** Force community-access to enabled when production gate is off for this test user. */
export async function installCommunityAccessStub(context: BrowserContext): Promise<void> {
  const apiOrigin = communityApiOriginOverride();
  if (!apiOrigin) return;

  await context.route(`**${COMMUNITY_ACCESS_PATH}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=300',
      },
      body: JSON.stringify({ enabled: true, apiOrigin }),
    });
  });
}

/**
 * Proxy community API calls to the local server so HTTPS portal pages can reach
 * http://127.0.0.1 without mixed-content blocking.
 */
export async function installCommunityApiProxy(context: BrowserContext): Promise<void> {
  const apiOrigin = communityApiOriginOverride();
  if (!apiOrigin) return;

  await context.route(`${apiOrigin}/**`, async (route) => {
    try {
      const response = await route.fetch({
        url: route.request().url(),
        method: route.request().method(),
        headers: route.request().headers(),
        postData: route.request().postDataBuffer(),
      });
      await route.fulfill({ response });
    } catch {
      await route.abort('failed');
    }
  });
}

export async function waitForCommunityActivityEntry(page: Page): Promise<void> {
  const entry = page.locator('.p-community-activity-entry');
  try {
    await expect(entry).toBeVisible({ timeout: 45_000 });
    return;
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(entry).toBeVisible({
      timeout: 75_000,
    });
  }
}

export async function resetDeveloperSurveyAnswered(worker: Worker): Promise<void> {
  await writeExtensionStorage(worker, { [SK.developerSurveyAnswered]: [] });
}

export async function openCommunityActivity(page: Page): Promise<void> {
  await waitForCommunityActivityEntry(page);
  await page.locator('.p-community-activity-entry').click();
}

export async function waitForDeveloperSurveyPanel(page: Page): Promise<boolean> {
  return page
    .locator('.p-developer-survey-panel')
    .isVisible({ timeout: 90_000 })
    .catch(() => false);
}

/** Fill required choice questions and optional text fields for the active survey. */
export async function fillDeveloperSurveyForm(page: Page): Promise<void> {
  const panel = page.locator('.p-developer-survey-panel');
  await panel.waitFor({ state: 'visible', timeout: 90_000 });

  for (const fieldset of await panel.locator('.p-developer-survey-question').all()) {
    const radio = fieldset.locator('input[type="radio"]').first();
    if (await radio.count()) {
      await radio.check();
      continue;
    }
    const checkbox = fieldset.locator('input[type="checkbox"]').first();
    if (await checkbox.count()) {
      await checkbox.check();
    }
  }

  for (const input of await panel.locator('.p-developer-survey-text').all()) {
    if ((await input.inputValue()).trim()) continue;
    await input.fill('E2E survey answer');
  }

  for (const textarea of await panel.locator('.p-developer-survey-textarea').all()) {
    if ((await textarea.inputValue()).trim()) continue;
    await textarea.fill('E2E survey feedback');
  }
}

export async function submitDeveloperSurveyForm(page: Page): Promise<void> {
  await fillDeveloperSurveyForm(page);
  await page.locator('.p-developer-survey-submit').click();
  await expect(page.locator('.p-developer-survey-success')).toBeVisible({ timeout: 60_000 });
}

export async function openThemeStudio(page: Page): Promise<void> {
  await page.locator('#p-open-settings').click();
  await expect(page.locator('#p-settings-pop')).toBeVisible({ timeout: 15_000 });
  await page.locator('.p-theme-section-title button').first().click();
  await expect(page.locator('#p-theme-studio-root')).toBeVisible({ timeout: 15_000 });
}
