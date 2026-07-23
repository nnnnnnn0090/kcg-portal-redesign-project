import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SK } from '../../contract/storage-keys';
import { storageClient } from './client';
import {
  decidePortalSyncBootstrap,
  markPortalSyncCacheClean,
  PORTAL_SYNC_CACHE_META_KEY,
  readPortalSyncCache,
  replacePortalSyncCache,
  type PortalSyncCacheMeta,
  type PortalSyncCacheSnapshot,
} from './portal-sync-cache';
import { storageRepo } from './repo';
import { installChromeStorageMock } from './chrome-storage-client.test-support';

const OWNER_A = '550e8400-e29b-41d4-a716-446655440000';
const OWNER_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

let stored: Record<string, unknown>;

function cacheSnapshot(meta: Partial<PortalSyncCacheMeta>): PortalSyncCacheSnapshot {
  return {
    meta: {
      version: 1,
      updatedAt: 0,
      dirty: false,
      ownerId: null,
      ...meta,
    },
    storage: {},
  };
}

describe('portal sync local cache', () => {
  beforeEach(() => {
    stored = {};
    installChromeStorageMock(stored);
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
  });

  it('persists synced settings and marks them dirty', async () => {
    stored[PORTAL_SYNC_CACHE_META_KEY] = {
      version: 1,
      updatedAt: 10,
      dirty: false,
      ownerId: OWNER_A,
    } satisfies PortalSyncCacheMeta;

    await storageClient.set({ [SK.theme]: 'light' });

    const cache = await readPortalSyncCache();
    expect(cache.storage[SK.theme]).toBe('light');
    expect(cache.meta).toEqual({
      version: 1,
      updatedAt: 1_000,
      dirty: true,
      ownerId: OWNER_A,
    });
  });

  it('does not mark LMS-only data as a portal sync change', async () => {
    await storageClient.set({ [SK.kingLmsCourses]: [{ displayName: 'A' }] });

    expect(stored[SK.kingLmsCourses]).toEqual([{ displayName: 'A' }]);
    expect(stored[PORTAL_SYNC_CACHE_META_KEY]).toBeUndefined();
  });

  it('replaces stale local keys with a clean portal snapshot', async () => {
    stored[SK.customThemes] = { schemaVersion: 1, themes: [{ id: 'stale' }] };
    stored[SK.hideProfileName] = true;

    await replacePortalSyncCache(
      {
        updatedAt: 200,
        storage: {
          [SK.theme]: 'blue',
          [SK.clientUserId]: OWNER_A,
        },
      },
      OWNER_A,
    );

    const cache = await readPortalSyncCache();
    expect(cache.storage).toEqual({
      [SK.theme]: 'blue',
      [SK.clientUserId]: OWNER_A,
    });
    expect(cache.meta).toEqual({
      version: 1,
      updatedAt: 200,
      dirty: false,
      ownerId: OWNER_A,
    });
  });

  it('only marks the exact saved revision clean', async () => {
    stored[PORTAL_SYNC_CACHE_META_KEY] = {
      version: 1,
      updatedAt: 20,
      dirty: true,
      ownerId: OWNER_A,
    } satisfies PortalSyncCacheMeta;

    await expect(markPortalSyncCacheClean(19, OWNER_A)).resolves.toBe(false);
    expect((await readPortalSyncCache()).meta.dirty).toBe(true);
    await expect(markPortalSyncCacheClean(20, OWNER_A)).resolves.toBe(true);
    expect((await readPortalSyncCache()).meta.dirty).toBe(false);
  });

  it('reads Home2 boot settings from the persistent cache', async () => {
    stored[SK.theme] = 'green';
    stored[SK.home2WebMailOverlay] = false;
    stored[SK.cplanOverlay] = false;
    stored[SK.language] = 'en';
    stored[SK.customThemes] = { schemaVersion: 1, themes: [] };

    await expect(storageRepo.getTheme()).resolves.toBe('green');
    await expect(storageRepo.getHome2WebMailOverlay()).resolves.toBe(false);
    await expect(storageRepo.getCplanOverlay()).resolves.toBe(false);
    await expect(storageRepo.getLanguage()).resolves.toBe('en');
    await expect(storageRepo.getCustomThemes()).resolves.toEqual({ schemaVersion: 1, themes: [] });
  });
});

describe('portal sync bootstrap decision', () => {
  it('uploads a newer dirty cache for the same owner', () => {
    const cache = cacheSnapshot({ updatedAt: 300, dirty: true, ownerId: OWNER_A });
    expect(decidePortalSyncBootstrap({ updatedAt: 200 }, OWNER_A, cache)).toBe('upload-local');
  });

  it('uses the portal for a newer remote revision', () => {
    const cache = cacheSnapshot({ updatedAt: 100, dirty: true, ownerId: OWNER_A });
    expect(decidePortalSyncBootstrap({ updatedAt: 200 }, OWNER_A, cache)).toBe('use-portal');
  });

  it('uses the portal when the owner differs', () => {
    const cache = cacheSnapshot({ updatedAt: 300, dirty: true, ownerId: OWNER_A });
    expect(decidePortalSyncBootstrap({ updatedAt: 200 }, OWNER_B, cache)).toBe('use-portal');
  });

  it('initializes an unowned legacy cache when the portal has no marker', () => {
    expect(decidePortalSyncBootstrap(null, null, cacheSnapshot({}))).toBe('initialize-local');
  });

  it('migrates an owned cache too when the current portal has no marker', () => {
    expect(decidePortalSyncBootstrap(null, null, cacheSnapshot({ ownerId: OWNER_A }))).toBe(
      'initialize-local',
    );
  });
});
