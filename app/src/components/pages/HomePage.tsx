/**
 * ホーム（ダッシュボード）ページです。
 * 授業カレンダー・課題カレンダー・お知らせ・ショートカットをまとめて表示します。
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { MSG, SK } from '../../shared/constants';
import storage from '../../lib/storage';
import { urls } from '../../lib/api';
import type { Settings } from '../../context/settings';
import { useCourses } from '../../context/courses';
import { usePortalDom } from '../../context/portalDom';
import type { LinkConfig } from '../../shared/types';
import { useHomeStorageBootstrap } from '../../hooks/useHomeStorageBootstrap';
import { useHomePortalInbox } from '../../hooks/useHomePortalInbox';
import { useLastLogin } from '../../hooks/useLastLogin';
import {
  useDeveloperNotice,
  DEVELOPER_NOTICE_SELECT_LABEL,
  DEVELOPER_NOTICE_TITLE_FALLBACK,
  isDeveloperNoticeLang,
} from '../../hooks/useDeveloperNotice';
import { PageShell } from '../layout/PageShell';
import { KinoPanel } from '../ui/KinoPanel';
import { NewsList } from '../ui/NewsList';
import { LinkEditor } from '../ui/LinkEditor';
import { CalendarPanel, AssignmentCalendar, type DuePayload } from '../../features/calendar';

// ─── 型 ───────────────────────────────────────────────────────────────────

interface HomePageProps {
  settings: Settings;
}

/** オーバーレイのスクロールルート内で、要素が縦方向ほぼ中央に来るよう scrollTop を計算する */
function scrollElementToVerticalCenter(
  scroller: HTMLElement,
  target: HTMLElement,
  behavior: ScrollBehavior,
): void {
  const cRect = scroller.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();
  const visibleOffsetTop = tRect.top - cRect.top;
  const nextTop = scroller.scrollTop + visibleOffsetTop - scroller.clientHeight / 2 + tRect.height / 2;
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const clamped = Math.max(0, Math.min(nextTop, maxScroll));
  // `smooth` は操作中のホイール等と合成されてずれることがある。瞬時合わせは scrollTop 直指定が確実。
  if (behavior === 'auto') {
    scroller.scrollTop = clamped;
  } else {
    scroller.scrollTo({ top: clamped, behavior });
  }
}

// ─── コンポーネント ────────────────────────────────────────────────────────

export function HomePage({ settings }: HomePageProps) {
  const { courses, setCourses } = useCourses();
  const { overlayRoot } = usePortalDom();

  const { kinoData, kogiNews, newTopicsItems, linkItems } = useHomePortalInbox();

  const [linkConfig,        setLinkConfig]        = useState<LinkConfig>({ order: [], hidden: [], custom: [] });
  const [assignmentPayload, setAssignmentPayload] = useState<DuePayload | null>(null);
  const [linksEditing,      setLinksEditing]      = useState(false);

  useHomeStorageBootstrap({ setLinkConfig, setAssignmentPayload, setCourses });

  // King LMS 課題同期でホームへ戻った直後、課題カレンダーへスクロール（bridge が立てたフラグ）
  useEffect(() => {
    let cancelled = false;
    let settleTimer: number | null = null;

    void storage.get(SK.portalScrollToAssignmentOnce).then((snap) => {
      if (cancelled) return;
      if (!snap[SK.portalScrollToAssignmentOnce]) return;
      void storage.set({ [SK.portalScrollToAssignmentOnce]: false });

      const run = () => {
        const el = document.getElementById('p-assignment-calendar-panel');
        if (!(el instanceof HTMLElement)) return;
        scrollElementToVerticalCenter(overlayRoot, el, 'auto');
      };

      const motionReduce =
        typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          run();
          // パネル入場（base.css の --p-enter-dur）後に再計測。初回はアニメ中の矩形でズレやすい。
          if (!motionReduce) {
            settleTimer = window.setTimeout(() => {
              settleTimer = null;
              if (cancelled) return;
              run();
            }, 480);
          }
        });
      });
    });

    return () => {
      cancelled = true;
      if (settleTimer != null) window.clearTimeout(settleTimer);
    };
  }, [overlayRoot]);

  const kogiDisplayDeps = useMemo(
    () => courses.map((c) => `${String(c.displayName ?? '')}\t${String(c.externalAccessUrl ?? '')}`).join('\n'),
    [courses],
  );
  const getKingLmsCourses = useCallback(() => courses, [courses]);
  const lastLogin         = useLastLogin();
  const { notice: developerNotice, lang: noticeLang, setLang: setNoticeLang } = useDeveloperNotice();

  const developerNoticeTitle =
    developerNotice?.byLang?.[noticeLang]?.title || DEVELOPER_NOTICE_TITLE_FALLBACK[noticeLang];
  const developerNoticeMessage = developerNotice?.byLang?.[noticeLang]?.message ?? '';

  return (
    <PageShell
      title="ホーム"
      headExtra={lastLogin ? <span className="p-last-login">{lastLogin}</span> : undefined}
    >
      <div className="p-stack">

        {developerNotice ? (
          <section className="p-panel">
            <span className="p-panel-head p-developer-notice-head">
              <span className="p-developer-notice-head-title">{developerNoticeTitle}</span>
              {developerNotice.canToggleLang ? (
                <div className="p-developer-notice-lang-wrap">
                  <select
                    className="p-developer-notice-lang-select"
                    value={noticeLang}
                    aria-label="Language / 言語"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (isDeveloperNoticeLang(v)) setNoticeLang(v);
                    }}
                  >
                    {developerNotice.langOptions.map((id) => (
                      <option key={id} value={id}>
                        {DEVELOPER_NOTICE_SELECT_LABEL[id]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </span>
            {developerNoticeMessage ? (
              <div className="p-panel-body" id="p-developer-notice">
                <p className="p-developer-notice-text">{developerNoticeMessage}</p>
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
