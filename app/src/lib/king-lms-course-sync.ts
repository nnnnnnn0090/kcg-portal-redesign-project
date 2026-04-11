/**
 * King LMS のコース一覧をフック経由で取得するための同期遷移。
 * 現在ページを返却先として保存し、コース一覧ページへ移動する。
 */

import { SK, KING_LMS_COURSE_SYNC_URL } from '../shared/constants';
import storage from './storage';

export interface BeginKingLmsCourseListSyncOptions {
  /** 設定パネルから開始したとき true（成功時の案内トーストを出さない） */
  toastQuiet?: boolean;
}

export async function beginKingLmsCourseListSync(options?: BeginKingLmsCourseListSyncOptions): Promise<void> {
  await storage.set({
    [SK.kingLmsSyncPending]:            true,
    [SK.kingLmsSyncReturnUrl]:          location.href,
    [SK.kingLmsSyncAwaitCourse]:        false,
    [SK.kingLmsCourseSyncToastQuiet]:   Boolean(options?.toastQuiet),
  });
  window.location.href = KING_LMS_COURSE_SYNC_URL;
}
