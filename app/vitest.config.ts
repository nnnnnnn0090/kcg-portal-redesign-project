import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: process.env.CI ? ['default'] : ['verbose'],
    env: {
      VITE_TELEMETRY_HMAC_SECRET: 'vitest-portal-sync-secret-key',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/entrypoints/**', 'src/domain/i18n/locales/**'],
      thresholds: {
        lines: 25,
        functions: 25,
        statements: 25,
        branches: 20,
      },
    },
  },
});
