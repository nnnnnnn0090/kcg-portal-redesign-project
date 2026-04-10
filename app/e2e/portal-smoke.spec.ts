/**
 * 実拡張を読み込んだ Chromium でポータルにアクセスし #portal-overlay が出ることを確認する。
 *
 * 事前に `npm run build` し、拡張ディレクトリを渡す:
 *   EXTENSION_PATH=.output/chrome-mv3 npm run test:e2e
 *
 * CI では未設定のためスイート全体がスキップされる。
 */

import { test, chromium, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const extensionPath = process.env.EXTENSION_PATH?.trim() ?? '';
const extOk           = Boolean(extensionPath && fs.existsSync(extensionPath));

(extOk ? test.describe : test.describe.skip)('ポータル拡張スモーク', () => {
  test('ポータルホームでオーバーレイが表示される', async () => {
    const userDataDir = path.join(os.tmpdir(), `kcg-portal-pw-${Date.now()}`);
    const resolvedExt = path.resolve(extensionPath);
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${resolvedExt}`,
        `--load-extension=${resolvedExt}`,
      ],
    });
    try {
      const page = await context.newPage();
      await page.goto('https://home.kcg.ac.jp/portal/Home/Index', {
        waitUntil: 'domcontentloaded',
        timeout:   60_000,
      });
      await expect(page.locator('#portal-overlay')).toBeVisible({ timeout: 45_000 });
    } finally {
      await context.close();
    }
  });
});
