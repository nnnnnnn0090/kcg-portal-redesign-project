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
        const href = id != null ? newsHref(String(id)) : '#';
        const dateStr = String(item.newsDate ?? '').replace(/-/g, '/');
        return (
          <article key={key} className={`p-news${unread ? ' p-news-unread' : ''}`}>
            <a className="p-news-link" href={href}>
              <div className="p-news-meta-row">
                <time dateTime={item.newsDate != null ? String(item.newsDate) : undefined}>{dateStr}</time>
              </div>
              <span className="p-news-title-line">
                <span className="p-news-title">{item.title}</span>
                {isNew && <span className="p-news-new-badge" aria-hidden="true">NEW</span>}
              </span>
              <span className="p-news-meta">{item.sender ?? ''} · {item.category ?? ''}</span>
            </a>
          </article>
        );
      })}
    </>
  );
}
