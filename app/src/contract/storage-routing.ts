import { isCrossContextHandoffStorageKey } from './cross-context-handoff-storage';
import { isPortalSyncedStorageKey } from './portal-synced-storage';

/** セッション内メモリ + マイリンク同期対象 */
export function usesExtensionMemory(key: string): boolean {
  return isPortalSyncedStorageKey(key) && !isCrossContextHandoffStorageKey(key);
}
