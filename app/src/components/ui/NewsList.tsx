/**
 * お知らせ一覧コンポーネント（ホームページのパネル用）。
 */

import type { NewsListItem } from '../../shared/types';
import { newsHref } from '../../lib/dom';

export type { NewsListItem } from '../../shared/types';

interface NewsListProps {
  items:     NewsListItem[];
  emptyMsg?: string;
}

export function NewsList({ items, emptyMsg = 'お知らせはありません' }: NewsListProps) {
  const filtered = items.filter((i) => i.title);

  if (filtered.length === 0) {
    return <p className="p-empty">{emptyMsg}</p>;
  }

  return (
    <>
      {filtered.map((item) => {
        const unread = String(item.readFlg) === '0';
        const isNew  = String(item.newFlg)  === '1';
        const id     = item.id;
        const key    = id != null ? String(id) : `${item.title}-${item.newsDate}`;
        return (
          <article key={key} className={`p-news${unread ? ' p-news-unread' : ''}`}>
            <time>{String(item.newsDate ?? '').replace(/-/g, '/')}</time>
            <a href={id != null ? newsHref(String(id)) : '#'}>
              {item.title}
              {isNew && <span className="p-news-new-badge" aria-hidden="true">NEW</span>}
            </a>
            <span>{item.sender ?? ''} · {item.category ?? ''}</span>
          </article>
        );
      })}
    </>
  );
}
