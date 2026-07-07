/**
 * 匿名ユーザー ID。マイリンク同期 JSON にのみ保存する。
 */

import { PORTAL_HOSTNAME } from '../contract/origins';
import { SK } from '../shared/constants';
import {
  fetchPortalExtensionSnapshot,
  savePortalExtensionSyncNow,
} from '../services/portal-settings-sync';
import storage from './storage';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let loadPromise: Promise<string> | null = null;

function generateClientUserId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeClientUserId(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return UUID_RE.test(s) ? s : null;
}

function onPortalHostname(): boolean {
  return typeof location !== 'undefined' && location.hostname === PORTAL_HOSTNAME;
}

/** マイリンク上の ID を返す。無ければ新規発行して即保存する */
export function getOrCreateClientUserId(): Promise<string> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const cached = normalizeClientUserId((await storage.get(SK.clientUserId))[SK.clientUserId]);
      if (cached) return cached;

      if (onPortalHostname()) {
        try {
          const portal = await fetchPortalExtensionSnapshot();
          const fromLinks = normalizeClientUserId(portal?.storage[SK.clientUserId]);
          if (fromLinks) {
            await storage.set({ [SK.clientUserId]: fromLinks });
            return fromLinks;
          }
        } catch {
          /* 未ログイン等 */
        }
      }

      const id = generateClientUserId();
      await storage.set({ [SK.clientUserId]: id });
      await savePortalExtensionSyncNow();
      return id;
    })();
  }
  return loadPromise;
}
