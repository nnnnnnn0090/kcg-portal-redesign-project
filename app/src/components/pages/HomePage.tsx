/**
 * ホームページ。
 * 授業カレンダー・課題カレンダー・お知らせ・ショートカットを統合表示する。
 */

import { useState, useCallback, useMemo } from 'react';
import { MSG } from '../../shared/constants';
import { urls } from '../../lib/api';
import type { Settings } from '../../context/settings';
import { useCourses } from '../../context/courses';
import type { LinkConfig } from '../../shared/types';
import { useHomeStorageBootstrap } from '../../hooks/useHomeStorageBootstrap';
import { useKogiNewsPrefetch } from '../../hooks/useKogiNewsPrefetch';
import { useHomePortalInbox } from '../../hooks/useHomePortalInbox';
import { useLastLogin } from '../../hooks/useLastLogin';
import { useDeveloperNotice } from '../../hooks/useDeveloperNotice';
import { PageShell } from '../layout/PageShell';
import { KinoPanel } from '../ui/KinoPanel';
import { NewsList } from '../ui/NewsList';
import { LinkEditor } from '../ui/LinkEditor';
import { CalendarPanel, AssignmentCalendar, type DuePayload } from '../../features/calendar';

// ─── 型 ───────────────────────────────────────────────────────────────────

interface HomePageProps {
  settings: Settings;
}

// ─── コンポーネント ────────────────────────────────────────────────────────

export function HomePage({ settings }: HomePageProps) {
  const { courses, setCourses } = useCourses();

  const { kinoData, kogiNews, newTopicsItems, linkItems } = useHomePortalInbox();

  const [linkConfig,        setLinkConfig]        = useState<LinkConfig>({ order: [], hidden: [], custom: [] });
  const [assignmentPayload, setAssignmentPayload] = useState<DuePayload | null>(null);
  const [linksEditing,      setLinksEditing]      = useState(false);

  useHomeStorageBootstrap({ setLinkConfig, setAssignmentPayload, setCourses });
  useKogiNewsPrefetch();

  const kogiDisplayDeps = useMemo(
    () => courses.map((c) => `${String(c.displayName ?? '')}\t${String(c.externalAccessUrl ?? '')}`).join('\n'),
    [courses],
  );
  const getKingLmsCourses = useCallback(() => courses, [courses]);
  const lastLogin         = useLastLogin();
  const developerNotice   = useDeveloperNotice();

  return (
    <PageShell
      title="ホーム"
      headExtra={lastLogin ? <span className="p-last-login">{lastLogin}</span> : undefined}
    >
      <div className="p-stack">

        {developerNotice ? (
          <section className="p-panel">
            <span className="p-panel-head">
              {developerNotice.title || '開発者からのお知らせ'}
            </span>
            {developerNotice.message ? (
              <div className="p-panel-body" id="p-developer-notice">
                <p className="p-developer-notice-text">{developerNotice.message}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        <KinoPanel data={kinoData} forceVisible={settings.kinoEmptyForce} />

        {/* 授業カレンダー */}
        <CalendarPanel
          calUrl={urls.kogiCalendar}
          calKind="kogi"
          titles={{ week: '今週の授業', month: '今月の授業' }}
          msgType={MSG.kogiCalendar}
          getKingLmsCourses={getKingLmsCourses}
          kogiDisplayDeps={kogiDisplayDeps}
          sleepMascotSlot
        />

        {/* 課題カレンダー */}
        <AssignmentCalendar
          payload={assignmentPayload}
          titles={{ week: '今週の課題', month: '今月の課題' }}
        />

        {/* 補修カレンダー */}
        <CalendarPanel
          calUrl={urls.hoshuCalendar}
          calKind="hoshu"
          titles={{ week: '今週の補修', month: '今月の補修' }}
          msgType={MSG.hoshuCalendar}
          hideWhenEmpty
          getForceVisible={() => settings.hoshuCalForce}
          forceVisibleDeps={String(settings.hoshuCalForce)}
        />

        {/* キャンパスカレンダー */}
        <CalendarPanel
          calUrl={urls.campusCalendar}
          calKind="campus"
          titles={{ week: '今週のキャンパス', month: '今月のキャンパス' }}
          msgType={MSG.campusCalendar}
          hideWhenEmpty
          getForceVisible={() => settings.campusCalForce}
          forceVisibleDeps={String(settings.campusCalForce)}
        />

        {/* 授業に関するお知らせ */}
        <section className="p-panel">
          <span className="p-panel-head">授業に関するお知らせ</span>
          <div className="p-panel-body" id="p-kogi-news">
            <NewsList items={kogiNews} />
          </div>
        </section>

        {/* お知らせ & ショートカット */}
        <div className="p-grid">
          <section className="p-panel">
            <span className="p-panel-head">お知らせ</span>
            <div className="p-panel-body" id="p-news">
              <NewsList items={newTopicsItems} />
            </div>
          </section>
          <section className="p-panel p-panel-links">
            <span className="p-panel-head">
              <span>ショートカット</span>
              <button
                type="button"
                className={`p-link-edit-btn${linksEditing ? ' is-active' : ''}`}
                id="p-link-edit-btn"
                onClick={() => setLinksEditing((v) => !v)}
              >
                {linksEditing ? '完了' : '編集'}
              </button>
            </span>
            <div className={`p-panel-body${linksEditing ? ' is-editing' : ''}`} id="p-links">
              <LinkEditor
                items={linkItems}
                config={linkConfig}
                onConfigChange={setLinkConfig}
                editing={linksEditing}
              />
            </div>
          </section>
        </div>

      </div>
    </PageShell>
  );
}
