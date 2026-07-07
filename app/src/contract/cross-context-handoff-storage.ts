import { SK } from './storage-keys';

/**
 * ポータル ↔ King LMS など別オリジン間の一時ハンドオフ用。
 * タブ間で共有するため chrome.storage.local を使う（マイリンク同期の対象キーは維持）。
 */
export const CROSS_CONTEXT_HANDOFF_STORAGE_KEYS = [
  SK.kingLmsCourses,
  SK.kingLmsAssignmentDue,
  SK.kingLmsSyncPending,
  SK.kingLmsSyncReturnUrl,
  SK.kingLmsSyncAwaitCourse,
  SK.kingLmsCourseSyncToastQuiet,
  SK.kingLmsAssignmentSyncPending,
  SK.kingLmsAssignmentSyncReturnUrl,
  SK.kingLmsAssignmentSyncAwaitCalendar,
  SK.portalScrollToAssignmentOnce,
  SK.language,
] as const;

const HANDOFF_KEY_SET = new Set<string>(CROSS_CONTEXT_HANDOFF_STORAGE_KEYS);

export function isCrossContextHandoffStorageKey(key: string): boolean {
  return HANDOFF_KEY_SET.has(key);
}

export function pickCrossContextHandoffStorage(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of CROSS_CONTEXT_HANDOFF_STORAGE_KEYS) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out;
}
