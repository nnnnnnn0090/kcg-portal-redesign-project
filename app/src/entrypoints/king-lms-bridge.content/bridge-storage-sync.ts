/** King LMS 同期の storage 更新 */

import { SK, SYNC_HASH } from '../../shared/constants';
import storage from '../../lib/storage';
import { isCoursePage, isLoginRedirectPage, isStreamPage } from './bridge-urls';
import { mountLoginHint, mountSyncOverlay, removeSyncOverlay } from './bridge-overlay-ui';
import {
  clearAssignmentTimer,
  clearCourseTimer,
  redirectAfterAssignment,
  redirectAfterCourse,
  startAssignmentTimer,
  startCourseTimer,
} from './bridge-redirect-flow';

export async function maybeShowOverlayFromStorage(): Promise<void> {
  const data = await storage.get([
    SK.kingLmsSyncPending,
    SK.kingLmsAssignmentSyncPending,
    SK.kingLmsAssignmentSyncAwaitStream,
    SK.kingLmsAssignmentSyncReturnUrl,
  ]);
  if (data[SK.kingLmsAssignmentSyncPending]) {
    mountSyncOverlay('課題を取得しています…');
    startAssignmentTimer();
  } else if (data[SK.kingLmsAssignmentSyncAwaitStream] && data[SK.kingLmsAssignmentSyncReturnUrl] && isStreamPage()) {
    mountSyncOverlay('課題を取得しています…');
    startAssignmentTimer();
  } else if (data[SK.kingLmsSyncPending]) {
    mountSyncOverlay();
    startCourseTimer();
  }
}

export async function cancelPendingForLoginRedirect(): Promise<void> {
  clearAssignmentTimer();
  clearCourseTimer();
  removeSyncOverlay();
  const data = await storage.get([SK.kingLmsSyncReturnUrl, SK.kingLmsAssignmentSyncReturnUrl]);
  const hadCourseReturn     = typeof data[SK.kingLmsSyncReturnUrl]           === 'string' && !!data[SK.kingLmsSyncReturnUrl];
  const hadAssignmentReturn = typeof data[SK.kingLmsAssignmentSyncReturnUrl] === 'string' && !!data[SK.kingLmsAssignmentSyncReturnUrl];
  await storage.set({
    [SK.kingLmsSyncPending]:               false,
    [SK.kingLmsSyncAwaitCourse]:           hadCourseReturn,
    [SK.kingLmsAssignmentSyncPending]:     false,
    [SK.kingLmsAssignmentSyncAwaitStream]: hadAssignmentReturn,
  });
  if (hadCourseReturn || hadAssignmentReturn) {
    mountLoginHint(hadAssignmentReturn && !hadCourseReturn);
  }
}

export async function saveCourses(courses: unknown[]): Promise<void> {
  if (isLoginRedirectPage()) { await cancelPendingForLoginRedirect(); return; }
  const data = await storage.get([SK.kingLmsSyncPending, SK.kingLmsSyncAwaitCourse, SK.kingLmsSyncReturnUrl]);
  let syncPending = !!data[SK.kingLmsSyncPending];
  const hadAwait  = !!data[SK.kingLmsSyncAwaitCourse];
  // AwaitCourse フラグ（ログイン後に戻ったケース）でも同期を継続する
  if (!syncPending && hadAwait && data[SK.kingLmsSyncReturnUrl] && isCoursePage()) syncPending = true;
  if (syncPending) mountSyncOverlay();
  const toSet: Record<string, unknown> = { [SK.kingLmsCourses]: courses };
  if (syncPending && hadAwait) { toSet[SK.kingLmsSyncAwaitCourse] = false; toSet[SK.kingLmsSyncPending] = true; }
  await storage.set(toSet);
  if (syncPending) await redirectAfterCourse(SYNC_HASH.courseDone);
}

export async function saveAssignmentDue(items: unknown[], capturedAt: number, captureState?: string): Promise<void> {
  const data = await storage.get([SK.kingLmsAssignmentSyncPending, SK.kingLmsAssignmentSyncAwaitStream, SK.kingLmsAssignmentSyncReturnUrl]);
  let syncPending = !!data[SK.kingLmsAssignmentSyncPending];
  const hadAwait  = !!data[SK.kingLmsAssignmentSyncAwaitStream];
  if (!syncPending && hadAwait && data[SK.kingLmsAssignmentSyncReturnUrl] && isStreamPage()) syncPending = true;
  if (syncPending) mountSyncOverlay('課題を取得しています…');

  if (captureState === 'error') {
    if (syncPending) {
      const errSet: Record<string, unknown> = {};
      if (hadAwait) { errSet[SK.kingLmsAssignmentSyncAwaitStream] = false; errSet[SK.kingLmsAssignmentSyncPending] = true; }
      await storage.set(errSet);
      await redirectAfterAssignment(SYNC_HASH.assignmentError);
    }
    return;
  }

  const toSet: Record<string, unknown> = { [SK.kingLmsStreamsUltraDue]: { items, capturedAt } };
  if (syncPending && hadAwait) { toSet[SK.kingLmsAssignmentSyncAwaitStream] = false; toSet[SK.kingLmsAssignmentSyncPending] = true; }
  await storage.set(toSet);
  if (syncPending) await redirectAfterAssignment(SYNC_HASH.assignmentDone);
}
