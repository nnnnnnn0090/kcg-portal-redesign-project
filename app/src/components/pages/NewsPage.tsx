/**
 * お知らせ一覧ページ。
 * 年度切替・配信元/カテゴリ/キーワードによる絞り込みを提供する。
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { urls, pageFetch, portalLastLoginRaw } from '../../lib/api';
import { currentNendo } from '../../lib/date';
import { usePortalMessage, type PortalCapturedMessage } from '../../hooks/usePortalMessage';
import type { NewsListItem } from '../../shared/types';
import {
  reduceNewsListPortalMessage,
  type NewsListPortalState,
} from '../../lib/portal-messages-pages';
import { NEWS_FILTER_CATEGORIES, NEWS_FILTER_SENDERS } from '../../shared/news-list-filters';
import { PageShell } from '../layout/PageShell';
import { KinoPanel } from '../ui/KinoPanel';

type NewsItem = NewsListItem;

interface NewsPageProps {
  kinoForce: boolean;
}

// ─── コンポーネント ────────────────────────────────────────────────────────

export function NewsPage({ kinoForce }: NewsPageProps) {
  const y0           = new Date().getFullYear();
  const initialNendo = String(currentNendo());

  const [nendo,          setNendo]          = useState(initialNendo);
  const [portalInbox,    setPortalInbox]   = useState<NewsListPortalState>({ kinoData: null, raw: null });
  const { kinoData, raw } = portalInbox;
  const [checkedSenders, setCheckedSenders] = useState<Set<string>>(new Set());
  const [checkedCats,    setCheckedCats]    = useState<Set<string>>(new Set());
  const [keyword,        setKeyword]        = useState('');

  // 応答が古い年度のものでないかを確認するために保持する
  const pendingNendo = useRef<string | null>(initialNendo);

  // 初回フェッチ
  useEffect(() => {
    pageFetch(urls.deliveredNendo(initialNendo, portalLastLoginRaw()));
  }, [initialNendo]);

  // 年度切替フェッチ
  function requestNendo(n: string) {
    setNendo(n);
    setPortalInbox((p) => ({ ...p, raw: null }));
    pendingNendo.current = n;
    pageFetch(urls.deliveredNendo(n, portalLastLoginRaw()));
  }

  const handleMessage = useCallback((msg: PortalCapturedMessage) => {
    setPortalInbox((prev) => reduceNewsListPortalMessage(prev, msg, pendingNendo));
  }, []);

  usePortalMessage(handleMessage);

  // ── フィルタ処理 ─────────────────────────────────────────────────────────

  function filteredList(): NewsItem[] {
    if (!Array.isArray(raw)) return [];
    let list = raw.slice();
    if (checkedSenders.size > 0) {
      list = list.filter((i) => checkedSenders.has(String(i.sender ?? '')));
    }
    if (checkedCats.size > 0) {
      list = list.filter((i) => checkedCats.has(String(i.categoryCd ?? '')));
    }
    const kw = keyword.trim().toLowerCase();
    if (kw) {
      list = list.filter((i) =>
        `${i.title ?? ''} ${i.sender ?? ''} ${i.category ?? ''} ${i.newsDate ?? ''}`.toLowerCase().includes(kw),
      );
    }
    return list;
  }

  function toggleSender(v: string) {
    setCheckedSenders((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  function toggleCat(v: string) {
    setCheckedCats((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  function clearFilters() {
    setCheckedSenders(new Set());
    setCheckedCats(new Set());
    setKeyword('');
  }

  const list     = filteredList();
  const nendoMsg = raw && raw.length > 0
    ? `${nendo}年度のお知らせ一覧を表示しています。`
    : raw !== null ? `${nendo}年度のお知らせはありません。` : '読み込み中…';

  let tableBody: React.ReactNode;
  if (raw === null) {
    tableBody = <tr><td colSpan={4}><p className="p-news-empty">読み込み中…</p></td></tr>;
  } else if (list.length === 0) {
    tableBody = <tr><td colSpan={4}><p className="p-news-empty">該当するお知らせはありません。</p></td></tr>;
  } else {
    tableBody = list.map((item, idx) => {
      const unread      = String(item.readFlg) === '0';
      const cls         = unread ? 'p-news-unread' : '';
      const isImportant = item.importanceCd && String(item.importanceCd) !== '01' && item.importance;
      const isNew       = String(item.newFlg) === '1';
      const href        = item.id != null
        ? new URL(`/portal/News/Detail/${encodeURIComponent(String(item.id))}`, location.origin).href
        : '#';
      return (
        <tr key={idx}>
          <td className={cls}>{String(item.newsDate ?? '')}</td>
          <td className={cls}>
            {isImportant && <span className="p-news-meta">{String(item.importance)}</span>}
            <a href={href} className={cls}>{String(item.title ?? '')}</a>
            {isNew && <span className="p-news-meta">NEW</span>}
          </td>
          <td className={cls}>{String(item.sender ?? '')}</td>
          <td className={cls}>{String(item.category ?? '')}</td>
        </tr>
      );
    });
  }

  return (
    <PageShell variant="news" title="お知らせ一覧">
      <KinoPanel data={kinoData} forceVisible={kinoForce} />

      <div className="p-news-page">
        <div className="p-news-primary">
          {/* 年度選択 */}
          <nav className="p-news-nendo-nav" aria-label="表示年度">
            {Array.from({ length: 5 }, (_, k) => {
              const n = String(y0 - k);
              return (
                <button
                  key={n}
                  type="button"
                  className={`p-news-nendo-btn${n === nendo ? ' is-active' : ''}`}
                  onClick={() => requestNendo(n)}
                >
                  {n} 年度
                </button>
              );
            })}
          </nav>

          <p className="p-news-nendo-msg">{nendoMsg}</p>

          <section className="p-panel p-news-table-wrap">
            <span className="p-panel-head">お知らせ一覧</span>
            <div className="p-news-table-scroll">
              <table className="p-news-table" aria-label="お知らせ一覧">
                <thead>
                  <tr>
                    <th scope="col">日時</th>
                    <th scope="col">タイトル</th>
                    <th scope="col">配信元</th>
                    <th scope="col">カテゴリ</th>
                  </tr>
                </thead>
                <tbody>{tableBody}</tbody>
              </table>
            </div>
          </section>
        </div>

        {/* 絞り込みサイドバー */}
        <aside className="p-news-aside" aria-label="絞り込み条件">
          <h2 className="p-news-filter-page-title">絞り込み条件</h2>

          <div className="p-news-mat">
            <h3>配信元で選択</h3>
            <ul className="p-news-checklist">
              {NEWS_FILTER_SENDERS.map((s, i) => (
                <li key={s}>
                  <input
                    type="checkbox"
                    id={`p-nfs-${i}`}
                    checked={checkedSenders.has(s)}
                    onChange={() => toggleSender(s)}
                  />
                  <label htmlFor={`p-nfs-${i}`}>{s}</label>
                </li>
              ))}
            </ul>
            <p className="p-news-mat-hint">※教員名で絞りたい場合はキーワードへ入力してください</p>
          </div>

          <div className="p-news-mat">
            <h3>カテゴリで選択</h3>
            <ul className="p-news-checklist">
              {NEWS_FILTER_CATEGORIES.map((c) => (
                <li key={c.value}>
                  <input
                    type="checkbox"
                    id={`p-nfc-${c.value}`}
                    checked={checkedCats.has(c.value)}
                    onChange={() => toggleCat(c.value)}
                  />
                  <label htmlFor={`p-nfc-${c.value}`}>{c.label}</label>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-news-mat">
            <h3>キーワード</h3>
            <input
              type="search"
              className="p-news-kw"
              placeholder="条件を入れてください"
              autoComplete="off"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className="p-news-clear">
            <button type="button" className="p-news-clear-btn" onClick={clearFilters}>
              条件クリア
            </button>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
