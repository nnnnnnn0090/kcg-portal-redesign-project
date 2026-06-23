/**
 * 拡張機能インストールごとに1つ発行する匿名ユーザー ID。
 * chrome.storage.local に永続化し、外部 JSON 取得時の識別ヘッダーに使う。
 */

import { SK } from '../shared/constants';
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

/** 保存済み ID を返す。無ければ生成して storage に保存する */
export function getOrCreateClientUserId(): Promise<string> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const data = await storage.get(SK.clientUserId);
      const existing = normalizeClientUserId(data[SK.clientUserId]);
      if (existing) return existing;
      const id = generateClientUserId();
      await storage.set({ [SK.clientUserId]: id });
      return id;
    })();
  }
  return loadPromise;
}
