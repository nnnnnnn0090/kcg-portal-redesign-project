/**
 * ホーム用の開発者お知らせ Markdown JSON（`title` / `message`、任意で `message_ja` 互換、各 `title_*` / `message_*`）を取得する。
 */

import { useMemo, useState, useEffect } from 'react';
import {
  CLIENT_INSTALL_AT_HEADER,
  CLIENT_LAST_UPDATED_AT_HEADER,
  CLIENT_USER_ID_HEADER,
  DEVELOPER_NOTICE_JSON_URL,
  EXTENSION_VERSION_HEADER,
} from '../shared/constants';
import { getOrCreateClientUserId } from '../lib/client-user-id';
import { getClientLifecycleTimestamps } from '../lib/extension-client-lifecycle';
import { readExtensionVersion } from '../lib/extension-version';
import type { AppLanguage } from '../i18n/messages';

/** JSON の接尾辞と一致（`title_zh_TW` / `message_zh_TW` など） */
export const DEVELOPER_NOTICE_LANG_IDS = [
  'ja',
  'en',
  'zh',
  'zh_TW',
  'ko',
  'vi',
  'ne',
  'id',
  'th',
] as const;

export type DeveloperNoticeLang = (typeof DEVELOPER_NOTICE_LANG_IDS)[number];

const SUFFIX: Record<DeveloperNoticeLang, string | null> = {
  ja:    null,
  en:    'en',
  zh:    'zh',
  zh_TW: 'zh_TW',
  ko:    'ko',
  vi:    'vi',
  ne:    'ne',
  id:    'id',
  th:    'th',
};

export const DEVELOPER_NOTICE_SELECT_LABEL: Record<DeveloperNoticeLang, string> = {
  ja:    '日本語',
  en:    'English',
  zh:    '简体中文',
  zh_TW: '繁體中文',
  ko:    '한국어',
  vi:    'Tiếng Việt',
  ne:    'नेपाली',
  id:    'Bahasa Indonesia',
  th:    'ไทย',
};

export const DEVELOPER_NOTICE_TITLE_FALLBACK: Record<DeveloperNoticeLang, string> = {
  ja:    '開発者からのお知らせ',
  en:    'Developer notice',
  zh:    '开发者通知',
  zh_TW: '擴充功能通知',
  ko:    '개발자 안내',
  vi:    'Thông báo',
  ne:    'सूचना',
  id:    'Pemberitahuan',
  th:    'ประกาศ',
};

export interface DeveloperNoticeI18n {
  byLang: Record<DeveloperNoticeLang, { title: string; message: string }>;
  langOptions: DeveloperNoticeLang[];
}

export interface UseDeveloperNoticeResult {
  notice: DeveloperNoticeI18n | null;
  lang: DeveloperNoticeLang;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function isDeveloperNoticeLang(v: unknown): v is DeveloperNoticeLang {
  return typeof v === 'string' && (DEVELOPER_NOTICE_LANG_IDS as readonly string[]).includes(v);
}

function rawTitle(json: Record<string, unknown>, id: DeveloperNoticeLang): string {
  const s = SUFFIX[id];
  return s ? str(json[`title_${s}`]) : '';
}

function rawMessage(json: Record<string, unknown>, id: DeveloperNoticeLang): string {
  if (id === 'ja') return str(json.message) || str(json.message_ja);
  const s = SUFFIX[id];
  return s ? str(json[`message_${s}`]) : '';
}

function fingerprint(x: { title: string; message: string }): string {
  return `${x.title}\0${x.message}`;
}

function preferredNoticeLang(preferred: AppLanguage, notice: DeveloperNoticeI18n | null): DeveloperNoticeLang {
  if (!notice?.langOptions.length) return preferred;
  if (notice.langOptions.includes(preferred)) return preferred;
  if (notice.langOptions.includes('ja')) return 'ja';
  if (notice.langOptions.includes('en')) return 'en';
  return notice.langOptions[0] ?? preferred;
}

/** リロードのたびに最新を取る（ブラウザ・CDN キャッシュを避ける） */
async function fetchDeveloperNoticeJson(): Promise<Response> {
  const url = new URL(DEVELOPER_NOTICE_JSON_URL);
  url.searchParams.set('_', String(Date.now()));
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
  };

  if (import.meta.env.VITE_PORTAL_DISTRIBUTION_BUILD === '1') {
    const [userId, lifecycle] = await Promise.all([
      getOrCreateClientUserId(),
      getClientLifecycleTimestamps(),
    ]);
    headers[CLIENT_USER_ID_HEADER] = userId;
    headers[CLIENT_INSTALL_AT_HEADER] = lifecycle.installAt;
    headers[CLIENT_LAST_UPDATED_AT_HEADER] = lifecycle.lastUpdatedAt;
    const version = readExtensionVersion();
    if (version) headers[EXTENSION_VERSION_HEADER] = version;
  } else {
    url.searchParams.set('contentOnly', '1');
  }

  return fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
    headers,
  });
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

        let titleJa   = str(json.title);
        let messageJa = rawMessage(json, 'ja');
        let hasJa     = titleJa.length > 0 || messageJa.length > 0;

        let hasSecondaryRaw = false;
        for (const id of DEVELOPER_NOTICE_LANG_IDS) {
          if (id === 'ja') continue;
          if (rawTitle(json, id) || rawMessage(json, id)) {
            hasSecondaryRaw = true;
            break;
          }
        }

        if (!hasJa && hasSecondaryRaw) {
          for (const id of DEVELOPER_NOTICE_LANG_IDS) {
            if (id === 'ja') continue;
            const tr = rawTitle(json, id);
            const mr = rawMessage(json, id);
            if (tr || mr) {
              titleJa   = tr || titleJa;
              messageJa = mr || messageJa;
              break;
            }
          }
          hasJa = titleJa.length > 0 || messageJa.length > 0;
        }

        const visible = hasJa || hasSecondaryRaw;
        if (!visible) {
          setNotice(null);
          return;
        }

        const byLang = {} as Record<DeveloperNoticeLang, { title: string; message: string }>;
        byLang.ja = { title: titleJa, message: messageJa };
        for (const id of DEVELOPER_NOTICE_LANG_IDS) {
          if (id === 'ja') continue;
          const tr = rawTitle(json, id);
          const mr = rawMessage(json, id);
          byLang[id] = {
            title:   tr || titleJa,
            message: mr || messageJa,
          };
        }

        const langOptions: DeveloperNoticeLang[] = [];
        if (titleJa.length > 0 || messageJa.length > 0) langOptions.push('ja');
        for (const id of DEVELOPER_NOTICE_LANG_IDS) {
          if (id === 'ja') continue;
          if (rawTitle(json, id) || rawMessage(json, id)) langOptions.push(id);
        }

        // Keep this calculation so equal translated payloads are normalized consistently.
        void new Set(DEVELOPER_NOTICE_LANG_IDS.map((id) => fingerprint(byLang[id])));

        setNotice({ byLang, langOptions });
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
