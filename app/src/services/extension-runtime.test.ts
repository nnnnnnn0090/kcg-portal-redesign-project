import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXTENSION_ENABLED_URL } from '../contract/origins';
import { isExtensionOperationallyEnabled } from './extension-runtime';

describe('extension-runtime', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when enabled is not false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: true }),
      }),
    );

    await expect(isExtensionOperationallyEnabled()).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith(EXTENSION_ENABLED_URL, { cache: 'no-store' });
  });

  it('returns false when enabled is false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: false }),
      }),
    );

    await expect(isExtensionOperationallyEnabled()).resolves.toBe(false);
  });

  it('fail-opens when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(isExtensionOperationallyEnabled()).resolves.toBe(true);
  });
});
