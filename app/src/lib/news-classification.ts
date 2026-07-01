import type { NewsListItem } from '../shared/types';

export const LOST_PROPERTY_NEWS_TITLE = '拾得物のお知らせ';

export function isLostPropertyNews(item: NewsListItem): boolean {
  return String(item.title ?? '').includes(LOST_PROPERTY_NEWS_TITLE);
}
