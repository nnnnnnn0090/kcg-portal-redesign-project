/**
 * ホーム初回マウント時に KogiNews の先読みと、storage からの課題読み込みをまとめる。
 * マイリンク復元完了後（settingsReady）にだけ走る。
 */

import { useEffect } from 'react';
import { SK } from '../shared/constants';
import storage from '../lib/storage';
import { pageFetch, urls } from '../lib/api';
import type { DuePayload } from '../ui/calendar';
import { migrateLocalCustomLinks, refreshPortalUserLinks } from '../services/user-html-link';
import { parseShortcutLayout, saveShortcutLayout } from '../services/shortcut-layout';

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
  settingsReady: boolean;
  setAssignmentPayload: (p: DuePayload | null) => void;
}

export function useHomeStorageBootstrap({
  settingsReady,
  setAssignmentPayload,
}: HomeStorageBootstrapParams): void {
  useEffect(() => {
    if (!settingsReady) return;

    refreshPortalUserLinks();
    void pageFetch(urls.kogiNews());
    void storage.get([SK.shortcutConfig, SK.kingLmsAssignmentDue]).then(async (data) => {
      const raw = data[SK.shortcutConfig];
      const legacyCustom = readLegacyCustomLinks(raw);
      if (legacyCustom.length > 0) {
        try {
          await migrateLocalCustomLinks(legacyCustom);
        } catch {
          /* ポータル未ログイン等は無視 */
        }
        await saveShortcutLayout(parseShortcutLayout(raw));
      }

      const due = data[SK.kingLmsAssignmentDue];
      if (isDuePayload(due)) setAssignmentPayload(due);
    });
  }, [settingsReady, setAssignmentPayload]);
}
