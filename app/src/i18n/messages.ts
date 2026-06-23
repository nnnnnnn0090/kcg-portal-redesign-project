import { enMessages } from './locales/en';
import { idMessages } from './locales/id';
import { jaMessages } from './locales/ja';
import { koMessages } from './locales/ko';
import { neMessages } from './locales/ne';
import { thMessages } from './locales/th';
import { viMessages } from './locales/vi';
import { zhMessages } from './locales/zh';
import { zhTWMessages } from './locales/zh-TW';

export const APP_LANGUAGES = [
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

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'ja';

export const APP_LANGUAGE_LABELS: Record<AppLanguage, string> = {
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

export const APP_LANGUAGE_LOCALES: Record<AppLanguage, string> = {
  ja:    'ja-JP',
  en:    'en-US',
  zh:    'zh-CN',
  zh_TW: 'zh-TW',
  ko:    'ko-KR',
  vi:    'vi-VN',
  ne:    'ne-NP',
  id:    'id-ID',
  th:    'th-TH',
};

/** 初回インストール時: ブラウザ言語から UI 言語を推定 */
export function detectDefaultLanguage(): AppLanguage {
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const raw of langs) {
      const tag = String(raw ?? '').trim().toLowerCase();
      if (!tag) continue;
      if (tag.startsWith('ja')) return 'ja';
      if (tag.startsWith('en')) return 'en';
      if (tag === 'zh-tw' || tag === 'zh-hk' || tag === 'zh-hant') return 'zh_TW';
      if (tag.startsWith('zh')) return 'zh';
      if (tag.startsWith('ko')) return 'ko';
      if (tag.startsWith('vi')) return 'vi';
      if (tag.startsWith('ne')) return 'ne';
      if (tag.startsWith('id')) return 'id';
      if (tag.startsWith('th')) return 'th';
    }
  } catch { /* ignore */ }
  return DEFAULT_LANGUAGE;
}

const messagesByLanguage: Record<AppLanguage, typeof jaMessages> = {
  ja:    jaMessages,
  en:    enMessages,
  zh:    zhMessages,
  zh_TW: zhTWMessages,
  ko:    koMessages,
  vi:    viMessages,
  ne:    neMessages,
  id:    idMessages,
  th:    thMessages,
};

export type I18nMessages = typeof jaMessages;

export function normalizeLanguage(value: unknown): AppLanguage {
  return typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value)
    ? value as AppLanguage
    : DEFAULT_LANGUAGE;
}

export function messagesForLanguage(language: unknown): I18nMessages {
  return messagesByLanguage[normalizeLanguage(language)];
}

export function localeForLanguage(language: unknown): string {
  return APP_LANGUAGE_LOCALES[normalizeLanguage(language)];
}

export function themeDisplayName(themeKey: string, fallback: string, language: unknown): string {
  const lang = normalizeLanguage(language);
  if (lang === 'ja') return fallback;
  return messagesByLanguage[lang].themeNames[themeKey] ?? fallback;
}
