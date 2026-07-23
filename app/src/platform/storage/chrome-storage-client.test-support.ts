import { vi } from 'vitest';

/** Vitest 用の最小 `chrome.storage.local` インメモリ実装。 */
export function installChromeStorageMock(stored: Record<string, unknown>): void {
  const listeners = new Set<
    (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void
  >();

  const emit = (changes: Record<string, chrome.storage.StorageChange>) => {
    for (const listener of listeners) listener(changes, 'local');
  };

  vi.stubGlobal('browser', undefined);
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get(keys: string | string[], callback: (value: Record<string, unknown>) => void) {
          const list = Array.isArray(keys) ? keys : [keys];
          const result: Record<string, unknown> = {};
          for (const key of list) {
            if (key in stored) result[key] = stored[key];
          }
          callback(result);
        },
        set(values: Record<string, unknown>, callback: () => void) {
          const changes: Record<string, chrome.storage.StorageChange> = {};
          for (const [key, value] of Object.entries(values)) {
            changes[key] = { oldValue: stored[key], newValue: value };
            stored[key] = value;
          }
          emit(changes);
          callback();
        },
        remove(keys: string | string[], callback: () => void) {
          const list = Array.isArray(keys) ? keys : [keys];
          const changes: Record<string, chrome.storage.StorageChange> = {};
          for (const key of list) {
            if (!(key in stored)) continue;
            changes[key] = { oldValue: stored[key], newValue: undefined };
            delete stored[key];
          }
          if (Object.keys(changes).length > 0) emit(changes);
          callback();
        },
      },
      onChanged: {
        addListener(
          listener: (
            changes: Record<string, chrome.storage.StorageChange>,
            areaName: string,
          ) => void,
        ) {
          listeners.add(listener);
        },
        removeListener(
          listener: (
            changes: Record<string, chrome.storage.StorageChange>,
            areaName: string,
          ) => void,
        ) {
          listeners.delete(listener);
        },
      },
    },
  });
}
