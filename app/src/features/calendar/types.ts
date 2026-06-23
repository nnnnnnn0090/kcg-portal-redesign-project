/**
 * カレンダー機能で共有する型定義です（API パラメータ・イベント・描画メタ情報）。
 */

import type { CalendarWeekStart } from '../../lib/date';
import type { AppLanguage } from '../../i18n/messages';

/** カレンダー API リクエストの uKbn + 半開区間 [start, end) */
export interface CalParams {
  uKbn:  string;
  start: string;
  end:   string;
}

/** カレンダーイベント（KogiCalendar / HoshuCalendar など） */
export interface CalEvent {
  title?:   string;
  tooltip?: string;
  href?:    string;
  calMeta?: string;
  calTime?: string;
  /** ISO 8601 日時文字列。API によっては日時まで含む場合がある */
  start?:   string;
  /** 課題カレンダー: gradebook user status から取得。未設定は判定不能（バッジ非表示） */
  assignmentSubmitted?: boolean;
}

/** グリッド描画時の表示オプション */
export interface ViewMeta {
  mode:           'week' | 'month';
  monthRef:       { y: number; m: number } | null;
  /** 授業カレンダー（kogi）で King LMS コース URL の解決に使う */
  kingLmsCourses: Array<{ displayName?: string; externalAccessUrl?: string }>;
  calKind:        string;
  /** 週列の左端。`range` の `start` 日の曜日と一致すること */
  weekStart:      CalendarWeekStart;
  /** グリッド内固定文言の表示言語 */
  language?:      AppLanguage;
}
