/**
 * カレンダー機能で使う共通型定義。
 */

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
}

/** グリッド描画時の表示オプション */
export interface ViewMeta {
  mode:           'week' | 'month';
  monthRef:       { y: number; m: number } | null;
  calLinkKingLms: boolean;
  kingLmsCourses: Array<{ displayName?: string; externalAccessUrl?: string }>;
  calKind:        string;
}
