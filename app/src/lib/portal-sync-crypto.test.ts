import { describe, expect, it } from 'vitest';
import {
  decryptPortalSyncPayload,
  encryptPortalSyncPayload,
  PORTAL_SYNC_WIRE_PREFIX,
  PORTAL_SYNC_WIRE_PREFIX_LEGACY,
} from './portal-sync-crypto';

const TEST_SECRET = 'vitest-portal-sync-secret-key';

describe('portal-sync-crypto', () => {
  it('encrypts and decrypts portal sync payloads', async () => {
    const plaintext = '{"version":3,"updatedAt":1,"storage":{}}';
    const wire = await encryptPortalSyncPayload(plaintext, TEST_SECRET);
    expect(wire?.startsWith(PORTAL_SYNC_WIRE_PREFIX)).toBe(true);
    expect(await decryptPortalSyncPayload(wire!, TEST_SECRET)).toBe(plaintext);
  });

  it('returns null for tampered ciphertext', async () => {
    const wire = await encryptPortalSyncPayload('{"ok":true}', TEST_SECRET);
    expect(wire).toBeTruthy();
    const tampered = `${wire!.slice(0, -1)}A`;
    expect(await decryptPortalSyncPayload(tampered, TEST_SECRET)).toBeNull();
  });

  it('decrypts legacy wire prefix', async () => {
    const plaintext = '{"v":4,"u":1,"s":{}}';
    const wire = await encryptPortalSyncPayload(plaintext, TEST_SECRET);
    expect(wire).toBeTruthy();
    const legacyWire = `${PORTAL_SYNC_WIRE_PREFIX_LEGACY}${wire!.slice(PORTAL_SYNC_WIRE_PREFIX.length)}`;
    expect(await decryptPortalSyncPayload(legacyWire, TEST_SECRET)).toBe(plaintext);
  });
});
