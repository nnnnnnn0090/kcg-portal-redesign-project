import { defineConfig } from '@playwright/test';
import path from 'node:path';

const extensionPath = path.join(process.cwd(), '.output/chrome-mv3');

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [
        ['line'],
        ['list', { printSteps: true }],
      ],
  use: {
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  },
  projects: [
    {
      name: 'e2e',
      testMatch: '**/*.spec.ts',
      testIgnore: ['**/flows/**'],
      use: {
        headless: false,
        launchOptions: {
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
          ],
        },
      },
    },
    {
      name: 'flows',
      testDir: './e2e/flows',
      testMatch: '**/*.spec.ts',
      timeout: 180_000,
      use: {
        headless: false,
      },
    },
  ],
});
