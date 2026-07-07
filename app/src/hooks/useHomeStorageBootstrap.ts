/**
 * ホーム初回マウント時に KogiNews の先読みと、storage からの課題・コース一覧読み込みをまとめる。
 */

import { useEffect } from 'react';
import { SK } from '../shared/constants';
import storage from '../lib/storage';
import { pageFetch, urls } from '../lib/api';
import { isCourseRowArray, type CourseRow } from '../context/courses';
import type { DuePayload } from '../ui/calendar';
import { migrateLocalCustomLinks, refreshPortalUserLinks } from '../services/user-html-link';

function isDuePayload(x: unknown): x is DuePayload {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.items) && typeof o.capturedAt === 'number';
}

function readLegacyCustomLinks(raw: unknown): Array<{ midashi: string; url: string }> {
  if (!raw || typeof raw !== 'object') return [];
  const custom = (raw as Record<string, unknown>).custom;
  if (!Array.isArray(custom)) return [];
  const out: Array<{ midashi: string; url: string }> = [];
  for (const entry of custom) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.midashi === 'string' && typeof row.url === 'string') {
      out.push({ midashi: row.midashi, url: row.url });
    }
  }
  return out;
}

export interface HomeStorageBootstrapParams {
  setAssignmentPayload: (p: DuePayload | null) => void;
  setCourses:           (rows: CourseRow[]) => void;
}

export function useHomeStorageBootstrap({
  setAssignmentPayload,
  setCourses,
}: HomeStorageBootstrapParams): void {
  useEffect(() => {
    refreshPortalUserLinks();
    void pageFetch(urls.kogiNews());
    void storage.get([SK.shortcutConfig, SK.kingLmsAssignmentDue, SK.kingLmsCourses]).then(async (data) => {
      const legacyCustom = readLegacyCustomLinks(data[SK.shortcutConfig]);
      if (legacyCustom.length > 0) {
        try {
          await migrateLocalCustomLinks(legacyCustom);
        } catch {
          /* ポータル未ログイン等は無視 */
        }
      }
      if (data[SK.shortcutConfig] !== undefined) {
        await storage.remove(SK.shortcutConfig);
      }

      const due = data[SK.kingLmsAssignmentDue];
      if (isDuePayload(due)) setAssignmentPayload(due);

      const c = data[SK.kingLmsCourses];
      if (isCourseRowArray(c)) setCourses(c);
    });
  }, [setAssignmentPayload, setCourses]);
}
