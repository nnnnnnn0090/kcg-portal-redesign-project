import { expect, test } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { chromium } from '@playwright/test';
import { extensionBuildReady } from './support/extension-context';

const extensionPath = path.join(process.cwd(), '.output/chrome-mv3');

test('loads MV3 service worker', async () => {
  test.skip(!extensionBuildReady(), 'extension build missing — run npm run build first');

  const userDataDir = mkdtempSync(path.join(tmpdir(), 'kcg-portal-e2e-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    let serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 30_000 });
    }

    expect(serviceWorker.url()).toMatch(/chrome-extension:\/\/.+\/background\.js$/);
  } finally {
    await context.close();
  }
});
