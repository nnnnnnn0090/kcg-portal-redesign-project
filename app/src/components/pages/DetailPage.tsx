/**
 * お知らせ詳細ページ。
 * お知らせ本文・掲載情報・添付ファイルを表示する。
 * 添付ファイルはポータル元 DOM の Knockout バインドが担うため、
 * 元 DOM のリンクを委譲クリックで呼び出す。
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { urls, pageFetch } from '../../lib/api';
import { usePortalMessage, type PortalCapturedMessage } from '../../hooks/usePortalMessage';
import {
  type NewsDetailPayload,
  reduceNewsDetailPortalMessage,
} from '../../lib/portal-messages-pages';
import { formatMessageBody } from '../../lib/dom';
import { PageShell } from '../layout/PageShell';

// ─── 型 ───────────────────────────────────────────────────────────────────

type NewsDetail = NewsDetailPayload;

interface DetailPageProps {
  newsDetailId: string;
}

// ─── 添付ファイル ──────────────────────────────────────────────────────────

/** ポータル元 DOM の添付ファイルリンクをファイル名で検索する（Knockout バインドが本体） */
function findPortalAttachmentLink(filename: string): HTMLAnchorElement | null {
  const want = String(filename).replace(/\s+/g, ' ').trim();
  if (!want) return null;
  return [...document.querySelectorAll<HTMLAnchorElement>('.attachments ul.fileList a, ul.fileList li a')]
    .filter((el) => !el.closest('#portal-overlay'))
    .find((a) => {
      const span = a.querySelector('[data-bind*="filename"]');
      const label = String((span && span.textContent) || a.textContent || '').replace(/\s+/g, ' ').trim();
      return label === want;
    }) ?? null;
}

function AttachmentList({ files }: { files: unknown[] }) {
  const listRef = useRef<HTMLUListElement>(null);

  // 委譲クリックで元 DOM のリンクを呼び出す
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    function onClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.p-news-detail-file-proxy');
      if (!a || !el!.contains(a)) return;
      e.preventDefault();
      const name = (a.dataset.filename ?? a.textContent ?? '').replace(/\s+/g, ' ').trim();
      findPortalAttachmentLink(name)?.click();
    }
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, []);

  const items = files.flatMap((f, i) => {
    let name: string;
    if (typeof f === 'string') {
      name = String(f).trim();
    } else if (f && typeof f === 'object') {
      const fo = f as Record<string, unknown>;
      name = String(fo.filename ?? fo.fileName ?? fo.name ?? 'ファイル').trim();
    } else {
      name = 'ファイル';
    }
    if (!name) return [];
    return [
      <li key={i}>
        <a href="#" className="p-news-detail-file-proxy" data-filename={name}>{name}</a>
      </li>,
    ];
  });

  if (items.length === 0) return null;
  return <ul className="p-news-detail-file-list" ref={listRef}>{items}</ul>;
}

// ─── コンポーネント ────────────────────────────────────────────────────────

export function DetailPage({ newsDetailId }: DetailPageProps) {
  const [detail,   setDetail]   = useState<NewsDetail | null>(null);

  // 詳細データをフェッチ
  useEffect(() => {
    pageFetch(urls.deliveredDetail(newsDetailId));
  }, [newsDetailId]);

  const handleMessage = useCallback((msg: PortalCapturedMessage) => {
    setDetail((prev) => reduceNewsDetailPortalMessage(prev, msg, newsDetailId));
  }, [newsDetailId]);

  usePortalMessage(handleMessage);

  const title    = detail ? String(detail.title ?? '').trim() || 'お知らせ' : '読み込み中…';
  const bodyHtml = detail ? formatMessageBody(String(detail.naiyo ?? '')) : '';
  const files    = detail && Array.isArray(detail.attachmentFiles) ? detail.attachmentFiles : [];

  const metaRows = detail ? [
    { key: '掲載日時', val: String(detail.newsDate ?? '').trim() },
    { key: '配信元',   val: String(detail.sender   ?? '').trim() },
    { key: 'カテゴリ', val: String(detail.category ?? '').trim() },
  ].filter((r) => r.val) : [];

  return (
    <PageShell
      variant="news"
      head={(
        <div className="p-main-head">
          <div className="p-news-detail-head-block">
            <a className="p-news-detail-back" href="/portal/News">お知らせ一覧</a>
            <h1 className="p-news-detail-title">{title}</h1>
          </div>
        </div>
      )}
    >
      <div className="p-stack">
        {/* 掲載情報 */}
        <section className="p-panel">
          <span className="p-panel-head">掲載情報</span>
          <div className="p-panel-body">
            {detail ? (
              metaRows.length > 0 ? (
                <div className="p-news-detail-meta-grid">
                  {metaRows.map((r) => (
                    <div key={r.key} className="p-news-detail-meta-row">
                      <span className="p-news-detail-meta-k">{r.key}</span>
                      <span className="p-news-detail-meta-v">{r.val}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="p-empty">情報はありません</p>
            ) : (
              <p className="p-empty">読み込み中…</p>
            )}
          </div>
        </section>

        {/* 本文 */}
        <section className="p-panel p-panel-kino">
          <span className="p-panel-head">本文</span>
          <div className="p-panel-body p-kino-message">
            {detail
              ? <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
              : <p className="p-empty">読み込み中…</p>
            }
          </div>
        </section>

        {/* 添付ファイル */}
        {files.length > 0 && (
          <section className="p-panel" id="p-news-detail-attachments">
            <span className="p-panel-head">添付ファイル</span>
            <div className="p-panel-body">
              <AttachmentList files={files} />
            </div>
          </section>
        )}

        <div className="p-news-detail-foot">
          <a className="p-nav-btn" href="/portal/">ホーム</a>
          <a className="p-nav-btn" href="/portal/News">お知らせ一覧</a>
        </div>
      </div>
    </PageShell>
  );
}
