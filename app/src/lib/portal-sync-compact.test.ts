import { describe, expect, it } from 'vitest';
import { SK } from '../contract/storage-keys';
import {
  compactPortalSyncStorage,
  decodePortalSyncCompactPayload,
  encodePortalSyncCompactPayload,
  expandPortalSyncStorage,
} from './portal-sync-compact';

describe('portal-sync-compact', () => {
  it('uses short keys and compact values', () => {
    const compact = compactPortalSyncStorage({
      [SK.theme]: 'dark',
      [SK.hideProfileName]: true,
      [SK.showKogiCalMascot]: false,
      [SK.calendarWeekStart]: 'monday',
      [SK.clientUserId]: '550e8400-e29b-41d4-a716-446655440000',
      [SK.customThemes]: { schemaVersion: 1, themes: [] },
    });
    expect(compact).toEqual({
      t: 'dark',
      h: 1,
      k: 0,
      w: 'm',
      id: '550e8400e29b41d4a716446655440000',
    });
    expect(compact.ct).toBeUndefined();
  });

  it('round-trips compact payload json', () => {
    const json = encodePortalSyncCompactPayload(1_700_000_000_000, {
      [SK.theme]: 'dark',
      [SK.language]: 'ja',
      [SK.home2WebMailOverlay]: true,
    });
    expect(json.length).toBeLessThan(80);
    const decoded = decodePortalSyncCompactPayload(json);
    expect(decoded?.updatedAt).toBe(1_700_000_000_000);
    expect(decoded?.storage[SK.theme]).toBe('dark');
    expect(decoded?.storage[SK.language]).toBe('ja');
    expect(decoded?.storage[SK.home2WebMailOverlay]).toBe(true);
  });

  it('expands compact storage back to long keys', () => {
    const expanded = expandPortalSyncStorage({
      t: 'dark',
      w: 's',
      id: '550e8400e29b41d4a716446655440000',
    });
    expect(expanded[SK.theme]).toBe('dark');
    expect(expanded[SK.calendarWeekStart]).toBe('sunday');
    expect(expanded[SK.clientUserId]).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
