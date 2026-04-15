/**
 * ホーム用の開発者お知らせ JSON（notice フィールド）を取得する。
 */

import { useState, useEffect } from 'react';
import { DEVELOPER_NOTICE_JSON_URL } from '../shared/constants';

interface NoticeJson {
  notice?: unknown;
}

/** 非空の `notice` のときだけ文字列。それ以外（未取得・失敗・空・非文字列）は null。 */
export function useDeveloperNotice(): string | null {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(DEVELOPER_NOTICE_JSON_URL, { method: 'GET', cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<NoticeJson>;
      })
      .then((data) => {
        if (cancelled) return;
        const n = data?.notice;
        const s = typeof n === 'string' ? n.trim() : '';
        setText(s.length > 0 ? s : null);
      })
      .catch(() => {
        if (!cancelled) setText(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return text;
}
