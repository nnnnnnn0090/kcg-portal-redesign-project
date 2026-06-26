import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppLanguage } from '../i18n/messages';
import { getOrCreateClientUserId } from '../lib/client-user-id';
import { getClientLifecycleTimestamps } from '../lib/extension-client-lifecycle';
import { readExtensionVersion } from '../lib/extension-version';
import storage from '../lib/storage';
import {
  CLIENT_INSTALL_AT_HEADER,
  CLIENT_LAST_UPDATED_AT_HEADER,
  CLIENT_USER_ID_HEADER,
  DEVELOPER_SURVEY_JSON_URL,
  DEVELOPER_SURVEY_RESPONSE_URL,
  EXTENSION_VERSION_HEADER,
  SK,
} from '../shared/constants';

export type DeveloperSurveyQuestionType = 'singleChoice' | 'multiChoice' | 'text' | 'textarea';

export interface DeveloperSurveyOption {
  id: string;
  label: string;
}

export interface DeveloperSurveyQuestion {
  id: string;
  type: DeveloperSurveyQuestionType;
  label: string;
  required: boolean;
  maxLength: number;
  options: DeveloperSurveyOption[];
}

export interface DeveloperSurvey {
  id: string;
  revision: string;
  title: string;
  description: string;
  questions: DeveloperSurveyQuestion[];
}

export type DeveloperSurveyAnswers = Record<string, string | string[]>;

type SurveyRaw = Record<string, unknown>;

export interface UseDeveloperSurveyResult {
  survey: DeveloperSurvey | null;
  answered: boolean;
  ready: boolean;
  submitting: boolean;
  submitted: boolean;
  error: string;
  submit: (answers: DeveloperSurveyAnswers) => Promise<boolean>;
}

const LANG_SUFFIX: Record<AppLanguage, string | null> = {
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

const QUESTION_TYPES = new Set<DeveloperSurveyQuestionType>([
  'singleChoice',
  'multiChoice',
  'text',
  'textarea',
]);

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function localized(raw: SurveyRaw, base: string, language: AppLanguage): string {
  const suffix = LANG_SUFFIX[language];
  if (suffix) {
    const exact = str(raw[`${base}_${suffix}`]);
    if (exact) return exact;
  }
  return str(raw[base]) || str(raw[`${base}_ja`]) || str(raw[`${base}_en`]);
}

function normalizeOptions(raw: unknown, language: AppLanguage): DeveloperSurveyOption[] {
  if (!Array.isArray(raw)) return [];
  const out: DeveloperSurveyOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as SurveyRaw;
    const id = str(obj.id);
    const label = localized(obj, 'label', language);
    if (!id || !label) continue;
    out.push({ id, label });
  }
  return out;
}

function normalizeSurvey(raw: unknown, language: AppLanguage): DeveloperSurvey | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as SurveyRaw;
  if (!bool(obj.enabled)) return null;

  const id = str(obj.id);
  const revision = str(obj.revision);
  const title = localized(obj, 'title', language);
  const description = localized(obj, 'description', language);
  if (!id || !revision || !title || !Array.isArray(obj.questions)) return null;

  const questions: DeveloperSurveyQuestion[] = [];
  for (const item of obj.questions) {
    if (!item || typeof item !== 'object') continue;
    const q = item as SurveyRaw;
    const qid = str(q.id);
    const type = str(q.type) as DeveloperSurveyQuestionType;
    const label = localized(q, 'label', language);
    if (!qid || !QUESTION_TYPES.has(type) || !label) continue;
    const options = normalizeOptions(q.options, language);
    if ((type === 'singleChoice' || type === 'multiChoice') && options.length === 0) continue;
    questions.push({
      id: qid,
      type,
      label,
      required: bool(q.required),
      maxLength: num(q.maxLength, type === 'textarea' ? 1000 : 160),
      options,
    });
  }
  if (questions.length === 0) return null;

  return { id, revision, title, description, questions };
}

function surveyKey(survey: DeveloperSurvey): string {
  return `${survey.id}:${survey.revision}`;
}

function answeredList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

async function surveyHeaders(): Promise<Record<string, string>> {
  const [userId, lifecycle] = await Promise.all([
    getOrCreateClientUserId(),
    getClientLifecycleTimestamps(),
  ]);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    [CLIENT_USER_ID_HEADER]: userId,
    [CLIENT_INSTALL_AT_HEADER]: lifecycle.installAt,
    [CLIENT_LAST_UPDATED_AT_HEADER]: lifecycle.lastUpdatedAt,
  };
  const version = readExtensionVersion();
  if (version) headers[EXTENSION_VERSION_HEADER] = version;
  return headers;
}

export function useDeveloperSurvey(language: AppLanguage): UseDeveloperSurveyResult {
  const [survey, setSurvey] = useState<DeveloperSurvey | null>(null);
  const [answeredKeys, setAnsweredKeys] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError('');

    void Promise.all([
      storage.get(SK.developerSurveyAnswered),
      surveyHeaders().then((headers) =>
        fetch(`${DEVELOPER_SURVEY_JSON_URL}?_=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          headers,
        }),
      ),
    ])
      .then(async ([stored, response]) => {
        if (!response.ok) throw new Error(String(response.status));
        const json = await response.json();
        if (cancelled) return;
        setAnsweredKeys(answeredList(stored[SK.developerSurveyAnswered]));
        setSurvey(normalizeSurvey(json, language));
      })
      .catch(() => {
        if (!cancelled) {
          setSurvey(null);
          setError('');
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  const answered = useMemo(
    () => Boolean(survey && answeredKeys.includes(surveyKey(survey))),
    [answeredKeys, survey],
  );

  const submit = useCallback(async (answers: DeveloperSurveyAnswers): Promise<boolean> => {
    if (!survey || submitting || answered) return false;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${DEVELOPER_SURVEY_RESPONSE_URL}?_=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: await surveyHeaders(),
        body: JSON.stringify({
          surveyId: survey.id,
          revision: survey.revision,
          answers,
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const key = surveyKey(survey);
      const next = Array.from(new Set([...answeredKeys, key]));
      await storage.set({ [SK.developerSurveyAnswered]: next });
      setAnsweredKeys(next);
      setSubmitted(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [answered, answeredKeys, submitting, survey]);

  return { survey, answered, ready, submitting, submitted, error, submit };
}
