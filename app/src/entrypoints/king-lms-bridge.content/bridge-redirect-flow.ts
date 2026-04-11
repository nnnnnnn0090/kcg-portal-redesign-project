/**
 * 同期タイムアウトタイマーとポータルへのリダイレクト。
 */

import { SK, SYNC_HASH } from '../../shared/constants';
import storage from '../../lib/storage';
import { buildRedirectUrl } from './bridge-urls';
import { removeSyncOverlay } from './bridge-overlay-ui';

const SYNC_SAFETY_MS = 120000;  // 2 分

let assignmentSyncTimer: ReturnType<typeof setTimeout> | null = null;
let courseSyncTimer:     ReturnType<typeof setTimeout> | null = null;

export function clearAssignmentTimer(): void {
  if (assignmentSyncTimer != null) { clearTimeout(assignmentSyncTimer); assignmentSyncTimer = null; }
}

export function clearCourseTimer(): void {
  if (courseSyncTimer != null) { clearTimeout(courseSyncTimer); courseSyncTimer = null; }
}

export function startAssignmentTimer(): void {
  clearAssignmentTimer();
  assignmentSyncTimer = setTimeout(async () => {
    assignmentSyncTimer = null;
    const d = await storage.get(SK.kingLmsAssignmentSyncPending);
    if (!d[SK.kingLmsAssignmentSyncPending]) return;
    removeSyncOverlay();
    await redirectAfterAssignment(SYNC_HASH.assignmentTimeout);
  }, SYNC_SAFETY_MS);
}

export function startCourseTimer(): void {
  clearCourseTimer();
  courseSyncTimer = setTimeout(async () => {
    courseSyncTimer = null;
    const d = await storage.get(SK.kingLmsSyncPending);
    if (!d[SK.kingLmsSyncPending]) return;
    removeSyncOverlay();
    await redirectAfterCourse(SYNC_HASH.courseTimeout);
  }, SYNC_SAFETY_MS);
}

export async function redirectAfterCourse(hash: string): Promise<void> {
  clearCourseTimer();
  const data = await storage.get([SK.kingLmsSyncPending, SK.kingLmsSyncReturnUrl]);
  if (!data[SK.kingLmsSyncPending]) return;
  const url = String(data[SK.kingLmsSyncReturnUrl] ?? '');
  if (!url) return;
  await storage.set({
    [SK.kingLmsSyncPending]:     false,
    [SK.kingLmsSyncReturnUrl]:   '',
    [SK.kingLmsSyncAwaitCourse]: false,
  });
  window.location.href = buildRedirectUrl(url, hash);
}

export async function redirectAfterAssignment(hash: string): Promise<void> {
  clearAssignmentTimer();
  const data = await storage.get([SK.kingLmsAssignmentSyncPending, SK.kingLmsAssignmentSyncReturnUrl]);
  if (!data[SK.kingLmsAssignmentSyncPending]) return;
  const url = String(data[SK.kingLmsAssignmentSyncReturnUrl] ?? '');
  if (!url) return;
  await storage.set({
    [SK.kingLmsAssignmentSyncPending]:   false,
    [SK.kingLmsAssignmentSyncReturnUrl]: '',
  });
  window.location.href = buildRedirectUrl(url, hash);
}
