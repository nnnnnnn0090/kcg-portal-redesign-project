import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SK } from '../contract/storage-keys';
import { installChromeStorageMock } from '../platform/storage/chrome-storage-client.test-support';
import {
  PORTAL_SYNC_CACHE_META_KEY,
  readPortalSyncCache,
  type PortalSyncCacheMeta,
} from '../platform/storage/portal-sync-cache';
import {
  persistDirtyPortalSyncCache,
  reconcilePortalExtensionCache,
  type PortalExtensionSnapshot,
} from './portal-settings-sync';

const OWNER = '550e8400-e29b-41d4-a716-446655440000';
let stored: Record<string, unknown>;

function seedDirtyCache(updatedAt = 500): void {
  stored[SK.theme] = 'orange';
  stored[SK.clientUserId] = OWNER;
  stored[PORTAL_SYNC_CACHE_META_KEY] = {
    version: 1,
    updatedAt,
    dirty: true,
    ownerId: OWNER,
  } satisfies PortalSyncCacheMeta;
}

describe('portal settings cache reconciliation', () => {
  beforeEach(() => {
    stored = {};
    installChromeStorageMock(stored);
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
  });

  it('keeps the cache dirty when a portal save fails', async () => {
    seedDirtyCache();

    const saved = await persistDirtyPortalSyncCache(async () => {
      throw new Error('portal unavailable');
    });

    expect(saved).toBe(false);
    expect((await readPortalSyncCache()).meta.dirty).toBe(true);
  });

  it('marks the exact uploaded revision clean after a successful save', async () => {
    seedDirtyCache();
    const save = vi.fn(async (_snapshot: PortalExtensionSnapshot) => undefined);

    await expect(persistDirtyPortalSyncCache(save)).resolves.toBe(true);

    expect(save).toHaveBeenCalledWith({
      updatedAt: 500,
      storage: {
        [SK.theme]: 'orange',
        [SK.clientUserId]: OWNER,
      },
    });
    expect((await readPortalSyncCache()).meta.dirty).toBe(false);
  });

  it('keeps the local cache untouched when the portal fetch fails', async () => {
    seedDirtyCache();
    const save = vi.fn(async (_snapshot: PortalExtensionSnapshot) => undefined);

    const ready = await reconcilePortalExtensionCache(async () => {
      throw new Error('not logged in');
    }, save);

    expect(ready).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect((await readPortalSyncCache()).meta).toMatchObject({
      updatedAt: 500,
      dirty: true,
      ownerId: OWNER,
    });
  });

  it('hydrates a newer portal snapshot and marks it clean', async () => {
    seedDirtyCache(100);
    const save = vi.fn(async (_snapshot: PortalExtensionSnapshot) => undefined);

    const ready = await reconcilePortalExtensionCache(
      async () => ({
        updatedAt: 200,
        storage: {
          [SK.theme]: 'blue',
          [SK.clientUserId]: OWNER,
        },
      }),
      save,
    );

    expect(ready).toBe(true);
    expect(save).not.toHaveBeenCalled();
    expect(await readPortalSyncCache()).toEqual({
      storage: {
        [SK.theme]: 'blue',
        [SK.clientUserId]: OWNER,
      },
      meta: {
        version: 1,
        updatedAt: 200,
        dirty: false,
        ownerId: OWNER,
      },
    });
  });

  it('uploads a newer dirty cache for the same client id', async () => {
    seedDirtyCache(300);
    const save = vi.fn(async (_snapshot: PortalExtensionSnapshot) => undefined);

    const ready = await reconcilePortalExtensionCache(
      async () => ({
        updatedAt: 200,
        storage: {
          [SK.theme]: 'blue',
          [SK.clientUserId]: OWNER,
        },
      }),
      save,
    );

    expect(ready).toBe(true);
    expect(save.mock.calls[0]?.[0]).toMatchObject({
      updatedAt: 300,
      storage: {
        [SK.theme]: 'orange',
        [SK.clientUserId]: OWNER,
      },
    });
    expect((await readPortalSyncCache()).meta.dirty).toBe(false);
  });

  it('uses the portal snapshot when the client id differs', async () => {
    seedDirtyCache(300);
    const otherOwner = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    const save = vi.fn(async (_snapshot: PortalExtensionSnapshot) => undefined);

    await reconcilePortalExtensionCache(
      async () => ({
        updatedAt: 200,
        storage: {
          [SK.theme]: 'blue',
          [SK.clientUserId]: otherOwner,
        },
      }),
      save,
    );

    expect(save).not.toHaveBeenCalled();
    expect(await readPortalSyncCache()).toEqual({
      storage: {
        [SK.theme]: 'blue',
        [SK.clientUserId]: otherOwner,
      },
      meta: {
        version: 1,
        updatedAt: 200,
        dirty: false,
        ownerId: otherOwner,
      },
    });
  });

  it('migrates an unowned legacy cache when the portal has no marker', async () => {
    stored[SK.theme] = 'legacy-theme';
    const save = vi.fn(async (_snapshot: PortalExtensionSnapshot) => undefined);

    const ready = await reconcilePortalExtensionCache(async () => null, save);

    expect(ready).toBe(true);
    const uploaded = save.mock.calls[0]?.[0];
    expect(uploaded?.storage[SK.theme]).toBe('legacy-theme');
    expect(uploaded?.storage[SK.clientUserId]).toMatch(/^[0-9a-f-]{36}$/i);
    const cache = await readPortalSyncCache();
    expect(cache.meta.dirty).toBe(false);
    expect(cache.meta.ownerId).toBe(uploaded?.storage[SK.clientUserId]);
  });

  it('preserves an owned local cache when the portal has no marker', async () => {
    seedDirtyCache();
    const save = vi.fn(async (_snapshot: PortalExtensionSnapshot) => undefined);

    await reconcilePortalExtensionCache(async () => null, save);

    expect(save.mock.calls[0]?.[0].storage).toMatchObject({
      [SK.theme]: 'orange',
      [SK.clientUserId]: OWNER,
    });
  });

  it('creates explicit defaults and a client id when no local or portal data exists', async () => {
    const save = vi.fn(async (_snapshot: PortalExtensionSnapshot) => undefined);

    await reconcilePortalExtensionCache(async () => null, save);

    expect(save.mock.calls[0]?.[0].storage).toMatchObject({
      [SK.theme]: 'dark',
      [SK.hideProfileName]: false,
      [SK.home2WebMailOverlay]: true,
      [SK.cplanOverlay]: true,
      [SK.calendarWeekStart]: 'monday',
      [SK.language]: 'ja',
      [SK.customThemes]: { schemaVersion: 1, themes: [] },
    });
    expect(save.mock.calls[0]?.[0].storage[SK.clientUserId]).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
