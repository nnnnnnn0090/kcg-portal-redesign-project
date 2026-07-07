/**
 * 拡張 storage クライアント。
 * 設定系はメモリ＋マイリンク API。LMS データ・同期ハンドオフは chrome.storage.local。
 */

import {
  CHROME_MIRROR_STORAGE_KEYS,
} from '../../contract/cross-context-handoff-storage';
import { usesExtensionMemory } from '../../contract/storage-routing';
import { chromeStorageClient } from './chrome-storage-client';
import {
  getPortalExtensionStoreValues,
  removePortalExtensionStoreValues,
  setPortalExtensionStoreValues,
  subscribePortalExtensionStore,
} from './portal-extension-store';

function normalizeKeys(keys: string | string[]): string[] {
  return Array.isArray(keys) ? keys : [keys];
}

function splitKeys(keys: readonly string[]): { memory: string[]; chrome: string[] } {
  const memory: string[] = [];
  const chrome: string[] = [];
  for (const key of keys) {
    if (usesExtensionMemory(key)) memory.push(key);
    else chrome.push(key);
  }
  return { memory, chrome };
}

function splitObject(obj: Record<string, unknown>): {
  memory: Record<string, unknown>;
  chrome: Record<string, unknown>;
} {
  const memory: Record<string, unknown> = {};
  const chrome: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (usesExtensionMemory(key)) memory[key] = value;
    else chrome[key] = value;
  }
  for (const key of CHROME_MIRROR_STORAGE_KEYS) {
    if (memory[key] !== undefined) chrome[key] = memory[key];
  }
  return { memory, chrome };
}

export const storageClient = {
  get(keys: string | string[]): Promise<Record<string, unknown>> {
    const keyList = normalizeKeys(keys);
    const { memory, chrome } = splitKeys(keyList);
    return Promise.all([
      chrome.length > 0 ? chromeStorageClient.get(chrome) : Promise.resolve({}),
      Promise.resolve(memory.length > 0 ? getPortalExtensionStoreValues(memory) : {}),
    ]).then(([chromeValues, memoryValues]) => ({ ...chromeValues, ...memoryValues }));
  },

  set(obj: Record<string, unknown>): Promise<void> {
    const { memory, chrome } = splitObject(obj);
    if (Object.keys(memory).length > 0) setPortalExtensionStoreValues(memory);
    if (Object.keys(chrome).length > 0) {
      return chromeStorageClient.set(chrome);
    }
    return Promise.resolve();
  },

  remove(keys: string | string[]): Promise<void> {
    const keyList = normalizeKeys(keys);
    const { memory, chrome } = splitKeys(keyList);
    if (memory.length > 0) removePortalExtensionStoreValues(memory);
    if (chrome.length > 0) return chromeStorageClient.remove(chrome);
    return Promise.resolve();
  },

  onChanged(
    listener: (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => void,
  ): () => void {
    const unsubChrome = chromeStorageClient.onChanged((changes, area) => {
      if (area !== 'local') return;
      listener(changes, area);
    });
    const unsubMemory = subscribePortalExtensionStore((changes, area) => {
      listener(changes, area);
    });
    return () => {
      unsubChrome();
      unsubMemory();
    };
  },
};

export default storageClient;
