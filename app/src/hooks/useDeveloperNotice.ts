/**
 * ホーム用の開発者お知らせ Markdown JSON（`title` / `message`、任意で `message_ja` 互換、各 `title_*` / `message_*`）を取得する。
 */

import { useMemo, useState, useEffect } from 'react';
import type { AppLanguage } from '../i18n/messages';
import {
  DEVELOPER_NOTICE_LANG_IDS,
  DEVELOPER_NOTICE_SELECT_LABEL,
  DEVELOPER_NOTICE_TITLE_FALLBACK,
  fetchDeveloperNoticeJson,
  isDeveloperNoticeLang,
  parseDeveloperNoticeJson,
  preferredNoticeLang,
  type DeveloperNoticeI18n,
  type DeveloperNoticeLang,
} from '../services/developer-content';

export {
  DEVELOPER_NOTICE_LANG_IDS,
  DEVELOPER_NOTICE_SELECT_LABEL,
  DEVELOPER_NOTICE_TITLE_FALLBACK,
  isDeveloperNoticeLang,
  type DeveloperNoticeI18n,
  type DeveloperNoticeLang,
};

export interface UseDeveloperNoticeResult {
  notice: DeveloperNoticeI18n | null;
  lang: DeveloperNoticeLang;
}

export function useDeveloperNotice(preferredLanguage: AppLanguage): UseDeveloperNoticeResult {
  const [notice, setNotice] = useState<DeveloperNoticeI18n | null>(null);
  const lang = useMemo(
    () => preferredNoticeLang(preferredLanguage, notice),
    [preferredLanguage, notice],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchDeveloperNoticeJson()
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Record<string, unknown>>;
      })
      .then((json) => {
        if (cancelled) return;
        setNotice(parseDeveloperNoticeJson(json));
      })
      .catch(() => {
        if (!cancelled) setNotice(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { notice, lang };
}
