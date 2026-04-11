/**
 * ホーム初回マウント時に storage からショートカット・課題・コース一覧を読み込む。
 */

import { useEffect } from 'react';
import { SK } from '../shared/constants';
import storage from '../lib/storage';
import type { CourseRow } from '../context/courses';
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

function isCourseRow(x: unknown): x is CourseRow {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.displayName != null && typeof o.displayName !== 'string') return false;
  if (o.externalAccessUrl != null && typeof o.externalAccessUrl !== 'string') return false;
  return true;
}

function isCourseRowArray(x: unknown): x is CourseRow[] {
  return Array.isArray(x) && x.every(isCourseRow);
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
    void storage.get([SK.shortcutConfig, SK.kingLmsStreamsUltraDue, SK.kingLmsCourses]).then((data) => {
      const cfg = data[SK.shortcutConfig];
      if (isLinkConfig(cfg)) setLinkConfig(cfg);

      const due = data[SK.kingLmsStreamsUltraDue];
      if (isDuePayload(due)) setAssignmentPayload(due);

      const c = data[SK.kingLmsCourses];
      if (isCourseRowArray(c)) setCourses(c);
    });
  }, [setLinkConfig, setAssignmentPayload, setCourses]);
}
