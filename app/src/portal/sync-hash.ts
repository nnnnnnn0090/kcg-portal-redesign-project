/** King LMS 同期結果の location.hash 読み取り */

import { SK, SYNC_HASH } from '../shared/constants';
import storage from '../lib/storage';

export const KING_LMS_COURSE_LIST_SYNC_SUCCESS_GUIDE_TOAST =
  '初回セットアップは完了しました。King LMS を開くには、該当の講義をもう一度クリックしてください。';

const HASH_MESSAGES: Record<string, string> = {
  [SYNC_HASH.courseDone]: KING_LMS_COURSE_LIST_SYNC_SUCCESS_GUIDE_TOAST,
  [SYNC_HASH.courseTimeout]:     'コース一覧の取得が時間内に完了しませんでした',
  [SYNC_HASH.assignmentDone]:    '課題を取得しました',
  [SYNC_HASH.assignmentTimeout]: '課題の取得が時間内に完了しませんでした',
  [SYNC_HASH.assignmentError]:   '課題データを読み取れませんでした（King LMS の変更の可能性があります）',
};

export function consumeKingLmsSyncReturnHash(): string {
  const hash = location.hash.replace(/^#/, '');
  const msg  = HASH_MESSAGES[hash] ?? '';

  if (msg) {
    try {
      history.replaceState(null, '', `${location.pathname}${location.search}`);
    } catch {
      try { location.hash = ''; } catch { /* ignore */ }
    }
  }
  return msg;
}

/** 起動時トースト: location.hash と storage の quiet フラグを解決する */
export async function resolveKingLmsMountToastMessage(): Promise<string> {
  let syncToastMsg = consumeKingLmsSyncReturnHash();
  const bootSnap = await storage.get([SK.kingLmsCourseSyncToastQuiet]);
  if (bootSnap[SK.kingLmsCourseSyncToastQuiet]) {
    await storage.set({ [SK.kingLmsCourseSyncToastQuiet]: false });
    if (syncToastMsg === KING_LMS_COURSE_LIST_SYNC_SUCCESS_GUIDE_TOAST) {
      syncToastMsg = 'コース一覧を保存しました';
    }
  }
  return syncToastMsg;
}
