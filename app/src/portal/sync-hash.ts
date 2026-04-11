/**
 * King LMS 同期結果を location.hash から読み取るユーティリティ。
 * 同期ページから戻ってきたとき、hash を消費してトーストメッセージ文字列を返す。
 */

import { SYNC_HASH } from '../shared/constants';

/** 講義クリックなどからの同期成功時トースト（設定からの再取得時は短文化される） */
export const KING_LMS_COURSE_LIST_SYNC_SUCCESS_GUIDE_TOAST =
  '初回セットアップは完了しました。King LMS を開くには、該当の講義をもう一度クリックしてください。';

const HASH_MESSAGES: Record<string, string> = {
  [SYNC_HASH.courseDone]: KING_LMS_COURSE_LIST_SYNC_SUCCESS_GUIDE_TOAST,
  [SYNC_HASH.courseTimeout]:     'コース一覧の取得が時間内に完了しませんでした',
  [SYNC_HASH.assignmentDone]:    '課題を取得しました',
  [SYNC_HASH.assignmentTimeout]: '課題の取得が時間内に完了しませんでした',
  [SYNC_HASH.assignmentError]:   '課題データを読み取れませんでした（King LMS の変更の可能性があります）',
};

/**
 * location.hash を消費し、対応するトーストメッセージを返す。
 * 該当する hash がなければ空文字を返す。
 */
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
