/**
 * ポータル同期対象の拡張状態（セッション内メモリのみ。chrome.storage には書かない）。
 */

import {
  isPortalSyncedStorageKey,
  pickPortalSyncedStorage,
} from '../../contract/portal-synced-storage';

export interface PortalExtensionMemorySnapshot {
  updatedAt: number;
  storage: Record<string, unknown>;
}

type StorageChange = chrome.storage.StorageChange;
type ChangeListener = (
  changes: Record<string, StorageChange>,
  areaName: 'local',
) => void;

let updatedAt = 0;
let memory: Record<string, unknown> = {};
const changeListeners = new Set<ChangeListener>();
let mutateListener: (() => void) | null = null;

function notifyChanges(changes: Record<string, StorageChange>): void {
  if (Object.keys(changes).length === 0) return;
  for (const listener of changeListeners) listener(changes, 'local');
}

export function registerPortalExtensionStoreMutator(listener: () => void): () => void {
  mutateListener = listener;
  return () => {
    if (mutateListener === listener) mutateListener = null;
  };
}

export function getPortalExtensionMemorySnapshot(): PortalExtensionMemorySnapshot {
  return {
    updatedAt,
    storage: pickPortalSyncedStorage(memory),
  };
}

export function getPortalExtensionStoreValues(keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (!isPortalSyncedStorageKey(key)) continue;
    if (memory[key] !== undefined) out[key] = memory[key];
  }
  return out;
}

export function setPortalExtensionStoreValues(values: Record<string, unknown>): void {
  const changes: Record<string, StorageChange> = {};
  for (const [key, value] of Object.entries(values)) {
    if (!isPortalSyncedStorageKey(key)) continue;
    const oldValue = memory[key];
    if (oldValue === value) continue;
    memory[key] = value;
    changes[key] = { oldValue, newValue: value };
  }
  if (Object.keys(changes).length === 0) return;
  notifyChanges(changes);
  mutateListener?.();
}

export function removePortalExtensionStoreValues(keys: readonly string[]): void {
  const changes: Record<string, StorageChange> = {};
  for (const key of keys) {
    if (!isPortalSyncedStorageKey(key)) continue;
    if (!(key in memory)) continue;
    const oldValue = memory[key];
    delete memory[key];
    changes[key] = { oldValue, newValue: undefined };
  }
  if (Object.keys(changes).length === 0) return;
  notifyChanges(changes);
  mutateListener?.();
}

export function hydratePortalExtensionStore(snapshot: PortalExtensionMemorySnapshot): void {
  updatedAt = snapshot.updatedAt;
  memory = { ...pickPortalSyncedStorage(snapshot.storage) };
}

export function setPortalExtensionStoreUpdatedAt(value: number): void {
  updatedAt = value;
}

export function subscribePortalExtensionStore(listener: ChangeListener): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}
