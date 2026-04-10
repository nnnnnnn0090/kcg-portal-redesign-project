/**
 * ホーム初回マウント時に storage からショートカット・課題・コース一覧を読み込む。
 */

import { useEffect } from 'react';
import { SK } from '../shared/constants';
import storage from '../lib/storage';
import type { CourseRow } from '../context/courses';
import type { LinkConfig } from '../shared/types';
import type { DuePayload } from '../features/calendar';

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
      if (cfg && typeof cfg === 'object') setLinkConfig(cfg as LinkConfig);

      const due = data[SK.kingLmsStreamsUltraDue];
      if (due && typeof due === 'object') setAssignmentPayload(due as DuePayload);

      const c = data[SK.kingLmsCourses];
      if (Array.isArray(c)) setCourses(c as CourseRow[]);
    });
  }, [setLinkConfig, setAssignmentPayload, setCourses]);
}
