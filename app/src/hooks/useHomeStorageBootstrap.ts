/**
 * ホーム初回マウント時に KogiNews の先読みと、storage からのショートカット・課題・コース一覧読み込みをまとめる。
 */

import { useEffect } from 'react';
import { SK } from '../shared/constants';
import storage from '../lib/storage';
import { pageFetch, urls } from '../lib/api';
import { isCourseRowArray, type CourseRow } from '../context/courses';
import type { CustomLink, LinkConfig } from '../shared/types';
import type { DuePayload } from '../features/calendar';

function isCustomLink(x: unknown): x is CustomLink {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.midashi === 'string' && typeof o.url === 'string';
}

function isLinkConfig(x: unknown): x is LinkConfig {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.order) || !o.order.every((e): e is string => typeof e === 'string')) return false;
  if (!Array.isArray(o.hidden) || !o.hidden.every((e): e is string => typeof e === 'string')) return false;
  if (!Array.isArray(o.custom) || !o.custom.every(isCustomLink)) return false;
  return true;
}

function isDuePayload(x: unknown): x is DuePayload {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.items) && typeof o.capturedAt === 'number';
}

export interface HomeStorageBootstrapParams {
  setLinkConfig:        (cfg: LinkConfig) => void;
  setAssignmentPayload: (p: DuePayload | null) => void;
  setCourses:           (rows: CourseRow[]) => void;
}

export function useHomeStorageBootstrap({
  setLinkConfig,
  setAssignmentPayload,
  setCourses,
}: HomeStorageBootstrapParams): void {
  useEffect(() => {
    void pageFetch(urls.kogiNews());
    void storage.get([SK.shortcutConfig, SK.kingLmsAssignmentDue, SK.kingLmsCourses]).then((data) => {
      const cfg = data[SK.shortcutConfig];
      if (isLinkConfig(cfg)) setLinkConfig(cfg);

      const due = data[SK.kingLmsAssignmentDue];
      if (isDuePayload(due)) setAssignmentPayload(due);

      const c = data[SK.kingLmsCourses];
      if (isCourseRowArray(c)) setCourses(c);
    });
  }, [setLinkConfig, setAssignmentPayload, setCourses]);
}
