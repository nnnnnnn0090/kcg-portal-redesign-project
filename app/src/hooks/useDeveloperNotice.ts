/**
 * ホーム用の開発者お知らせ JSON（`title` / `message`）を取得する。
 */

import { useState, useEffect } from 'react';
import { DEVELOPER_NOTICE_JSON_URL } from '../shared/constants';

export interface DeveloperNotice {
  title:   string;
  message: string;
}

interface NoticeJson {
  title?:   unknown;
  message?: unknown;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** `title` と `message` のどちらかが非空のときだけオブジェクト。それ以外は null。 */
export function useDeveloperNotice(): DeveloperNotice | null {
  const [data, setData] = useState<DeveloperNotice | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(DEVELOPER_NOTICE_JSON_URL, { method: 'GET', cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<NoticeJson>;
      })
      .then((json) => {
        if (cancelled) return;
        const title   = str(json?.title);
        const message = str(json?.message);
        setData(title.length > 0 || message.length > 0 ? { title, message } : null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
