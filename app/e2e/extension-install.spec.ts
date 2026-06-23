import { chromium, expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const extensionPath = process.env.EXTENSION_PATH?.trim();
const portalUrl = process.env.CHROME_DEV_URL?.trim() || 'https://home.kcg.ac.jp/portal';

test.describe('extension install smoke', () => {
  test.skip(!extensionPath || !fs.existsSync(path.join(extensionPath, 'manifest.json')), 'EXTENSION_PATH unset or invalid');

  test('loads extension and injects portal early content', async () => {
    const userDataDir = path.join(process.cwd(), '.chrome-e2e-profile');
    fs.rmSync(userDataDir, { recursive: true, force: true });

    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chrome',
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    try {
      const page = await context.newPage();
      await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expect(page.locator('#portal-theme-vars')).toBeAttached({ timeout: 30_000 });
    } finally {
      await context.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  });
});
