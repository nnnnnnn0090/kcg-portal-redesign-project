/**
 * お知らせ一覧ページの絞り込み UI 用定数（表示ラベル・API 値の対応）。
 */

export const NEWS_FILTER_SENDERS = [
  '大学より',
  'システム室/System Dep',
  'CTLE',
  'KCGイベントグループ',
  'KCG OSS',
  'キャリアセンター',
  'KCG AAO',
  'KCGI OSS',
  'KCGI AAO',
  'KCGI Career',
  'KCGM',
  'KJLTC',
] as const;

export const NEWS_FILTER_CATEGORIES = [
  { value: '001', label: '学校より / School Announcements' },
  { value: '002', label: '学生呼び出し / Private Notice' },
  { value: '003', label: '休講・補講 / Canceled ・ Make-Up Classes' },
  { value: '004', label: '教室変更 / Classroom Change Notice' },
  { value: '005', label: '成績通知 / Grade Announcement' },
] as const;
