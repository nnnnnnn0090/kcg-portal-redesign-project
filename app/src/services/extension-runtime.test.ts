/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXTENSION_ENABLED_URL } from '../contract/origins';
import {
  isExtensionBlockedByRemoteKillSwitch,
  isExtensionOperationallyEnabled,
  startExtensionOperationalWatch,
} from './extension-runtime';

const REMOTE_KILL_SWITCH_SESSION_KEY = 'kcgExtensionRemoteDisabled';

describe('extension-runtime', () => {
  beforeEach(() => {
    sessionStorage.clear();
    delete document.documentElement.dataset.kcgExtRuntimeWatch;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
    delete document.documentElement.dataset.kcgExtRuntimeWatch;
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

  it('marks session and reloads when kill switch turns off asynchronously', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...location, reload });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: false }),
      }),
    );

    startExtensionOperationalWatch();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(sessionStorage.getItem(REMOTE_KILL_SWITCH_SESSION_KEY)).toBe('1');
    expect(isExtensionBlockedByRemoteKillSwitch()).toBe(true);
  });

  it('clears session and reloads when kill switch turns back on while blocked', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...location, reload });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: true }),
      }),
    );
    sessionStorage.setItem(REMOTE_KILL_SWITCH_SESSION_KEY, '1');

    startExtensionOperationalWatch();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(sessionStorage.getItem(REMOTE_KILL_SWITCH_SESSION_KEY)).toBeNull();
    expect(isExtensionBlockedByRemoteKillSwitch()).toBe(false);
  });

  it('starts operational watch only once', async () => {
    const reload = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: false }),
    });
    vi.stubGlobal('location', { ...location, reload });
    vi.stubGlobal('fetch', fetchMock);

    startExtensionOperationalWatch();
    startExtensionOperationalWatch();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
