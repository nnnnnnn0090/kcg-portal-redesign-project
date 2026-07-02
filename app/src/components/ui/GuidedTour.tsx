/**
 * 初回ホーム表示時のオンボーディング。
 * 言語とテーマの初期設定後、実画面上で主要機能を短く案内する。
 */

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import { PAGE, SK } from '../../shared/constants';
import type { PortalRoute } from '../../portal/router';
import storage from '../../lib/storage';
import { usePortalDom } from '../../context/portalDom';
import { useSettings } from '../../context/settings';
import { themeDisplayName, useI18n } from '../../i18n';
import { THEMES, type ThemeTokens } from '../../themes';
import { LanguagePicker } from './LanguagePicker';
import type { AppLanguage } from '../../i18n/messages';
import homeCornerCharacterUrl from '../../assets/914_20260621035718-display.webp';

type TourPhase = 'loading' | 'language' | 'tour' | 'off';

type TourStep =
  | {
      kind: 'welcome' | 'theme' | 'weekStart' | 'character' | 'done';
      id: string;
    }
  | {
      kind: 'spotlight';
      id: string;
      selector: string;
      /** 主セレクタが DOM にないときのフォールバック */
      selectorFallback?: string;
    };

const STEPS: TourStep[] = [
  { kind: 'welcome', id: 'welcome' },
  { kind: 'theme', id: 'theme' },
  { kind: 'weekStart', id: 'week-start' },
  { kind: 'character', id: 'character' },
  {
    kind: 'spotlight',
    id: 'kogi',
    selector: '.p-panel-cal-wrap:has(section.p-panel-cal[data-cal-kind="kogi"])',
    selectorFallback: 'section.p-panel-cal[data-cal-kind="kogi"]',
  },
  {
    kind: 'spotlight',
    id: 'calendar-mode',
    selector: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-mode',
    selectorFallback: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-toolbar',
  },
  {
    kind: 'spotlight',
    id: 'kogi-hover',
    selector: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-ev[data-cal-kind="kogi"]',
    selectorFallback: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-body',
  },
  {
    kind: 'spotlight',
    id: 'kogi-context',
    selector: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-ev[data-cal-kind="kogi"]',
    selectorFallback: 'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-body',
  },
  {
    kind: 'spotlight',
    id: 'assignment-overview',
    selector: '#p-assignment-calendar-panel',
  },
  {
    kind: 'spotlight',
    id: 'assignment',
    selector: '#p-assignment-refresh-btn',
    selectorFallback: '#p-assignment-calendar-panel',
  },
  {
    kind: 'spotlight',
    id: 'shortcuts',
    selector: 'section.p-panel.p-panel-links',
    selectorFallback: '#p-links',
  },
  {
    kind: 'spotlight',
    id: 'attendance',
    selector: '#p-shortcut-attendance',
    selectorFallback: '#p-link-edit-btn',
  },
  {
    kind: 'spotlight',
    id: 'webmail',
    selector: '#p-shortcut-webmail',
    selectorFallback: '#p-link-edit-btn',
  },
  { kind: 'done', id: 'done' },
];

/** 最初に見せる候補。明暗・色味を偏らせず、選びやすい数に絞る。 */
const RECOMMENDED_THEME_KEYS = ['dark', 'light', 'tokyoNight', 'cherryBlossom'] as const;

const mascotIllustratorName = import.meta.env.VITE_MASCOT_ILLUSTRATOR_NAME?.trim() ?? '';
const mascotIllustratorUrl = import.meta.env.VITE_MASCOT_ILLUSTRATOR_URL?.trim() ?? '';

const ASSIGNMENT_STEP_IDS = new Set(['assignment-overview', 'assignment']);
const CALENDAR_OVERVIEW_STEP_IDS = new Set(['kogi', 'assignment-overview']);
const HOLE_PAD = 10;
const MIN_SPOTLIGHT_EL_PX = 2;
const SCROLL_SETTLE_MS = 420;
const HOLE_RETRY_MS = 100;
const HOLE_RETRY_MAX = 15;
const DOCK_EXIT_MS = 180;
const FINISH_WAIT_MS = 2000;
const FINISH_FADE_MS = 360;

function isSetupDockStep(step: TourStep | undefined): boolean {
  return step?.kind === 'theme' || step?.kind === 'weekStart' || step?.kind === 'character';
}

interface Hole {
  x: number;
  y: number;
  w: number;
  h: number;
}

function sameHole(a: Hole | null, b: Hole | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

type ThemePreviewStyle = CSSProperties & {
  '--p-tour-preview-bg': string;
  '--p-tour-preview-bg2': string;
  '--p-tour-preview-text': string;
  '--p-tour-preview-accent': string;
  '--p-tour-preview-border': string;
};

function readHole(selector: string, root: Document | HTMLElement): Hole | null {
  const el = root.querySelector(selector);
  if (!(el instanceof HTMLElement)) return null;
  const r = el.getBoundingClientRect();
  if (r.width < MIN_SPOTLIGHT_EL_PX || r.height < MIN_SPOTLIGHT_EL_PX) return null;
  return {
    x: r.left - HOLE_PAD,
    y: r.top - HOLE_PAD,
    w: r.width + HOLE_PAD * 2,
    h: r.height + HOLE_PAD * 2,
  };
}

function readSpotlightHole(
  step: Extract<TourStep, { kind: 'spotlight' }>,
  root: HTMLElement,
): Hole | null {
  return (
    readHole(step.selector, root) ??
    (step.selectorFallback ? readHole(step.selectorFallback, root) : null)
  );
}

function querySpotlightElement(
  step: Extract<TourStep, { kind: 'spotlight' }>,
  root: HTMLElement,
): HTMLElement | null {
  const pick = (selector: string): HTMLElement | null => {
    const el = root.querySelector(selector);
    if (!(el instanceof HTMLElement)) return null;
    const r = el.getBoundingClientRect();
    return r.width >= MIN_SPOTLIGHT_EL_PX && r.height >= MIN_SPOTLIGHT_EL_PX ? el : null;
  };
  return pick(step.selector) ?? (step.selectorFallback ? pick(step.selectorFallback) : null);
}

function scrollSpotlightToOverlayCenter(
  target: HTMLElement,
  scrollRoot: HTMLElement,
  behavior: ScrollBehavior,
): void {
  const rootRect = scrollRoot.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const deltaY = targetRect.top + targetRect.height / 2 - (rootRect.top + rootRect.height / 2);
  const maxTop = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
  const nextTop = Math.min(maxTop, Math.max(0, scrollRoot.scrollTop + deltaY));
  scrollRoot.scrollTo({ top: nextTop, behavior });
}

/** テーマ選択では、実画面の授業カレンダー上端をドックより上の見える位置へ合わせる。 */
function scrollThemePreviewToCalendar(scrollRoot: HTMLElement, behavior: ScrollBehavior): void {
  const target =
    scrollRoot.querySelector('.p-panel-cal-wrap:has(section[data-cal-kind="kogi"])') ??
    scrollRoot.querySelector('section.p-panel-cal[data-cal-kind="kogi"]');
  if (!(target instanceof HTMLElement)) {
    scrollRoot.scrollTo({ top: 0, left: 0, behavior });
    return;
  }
  const rootRect = scrollRoot.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const header = scrollRoot.querySelector('.p-header');
  const headerBottom =
    header instanceof HTMLElement
      ? Math.max(0, header.getBoundingClientRect().bottom - rootRect.top)
      : 0;
  const topInset = headerBottom + 16;
  const maxTop = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
  const nextTop = Math.min(
    maxTop,
    Math.max(0, scrollRoot.scrollTop + targetRect.top - rootRect.top - topInset),
  );
  scrollRoot.scrollTo({ top: nextTop, left: 0, behavior });
}

export interface GuidedTourProps {
  route: PortalRoute;
  settingsReady: boolean;
  /** ホームで課題カレンダーを出していないとき、案内ステップから除外する */
  hideAssignmentCalendar?: boolean;
  /** 増えるたびに案内を先頭から再開する（設定の「もう一度見る」） */
  guidedTourReplayToken?: number;
}

export function GuidedTour({
  route,
  settingsReady,
  hideAssignmentCalendar = false,
  guidedTourReplayToken = 0,
}: GuidedTourProps) {
  const { language, t } = useI18n();
  const { settings, updateSetting, updateTheme } = useSettings();
  const { overlayRoot } = usePortalDom();
  const steps = useMemo(
    () =>
      hideAssignmentCalendar ? STEPS.filter((step) => !ASSIGNMENT_STEP_IDS.has(step.id)) : STEPS,
    [hideAssignmentCalendar],
  );
  const [phase, setPhase] = useState<TourPhase>('loading');
  const [stepIndex, setStepIndex] = useState(0);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [hole, setHole] = useState<Hole | null>(null);
  const [cardSize, setCardSize] = useState({ w: 0, h: 0 });
  const [dockExiting, setDockExiting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [finishingFade, setFinishingFade] = useState(false);
  const maskSuffix = useId().replace(/:/g, '');
  const maskId = `p-tour-mask-${maskSuffix}`;
  const cardRef = useRef<HTMLDivElement>(null);
  const outlinedTargetRef = useRef<HTMLElement | null>(null);
  const retryRef = useRef(0);
  const dockTransitionTimerRef = useRef<number | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (route.page !== PAGE.HOME || !settingsReady) {
      setPhase('off');
      return;
    }
    let cancelled = false;
    void storage.get([SK.portalGuidedTourDone, SK.portalLanguagePickerDone]).then((data) => {
      if (cancelled) return;
      if (data[SK.portalGuidedTourDone]) {
        setPhase('off');
        return;
      }
      setPhase(data[SK.portalLanguagePickerDone] ? 'tour' : 'language');
    });
    return () => {
      cancelled = true;
    };
  }, [route.page, settingsReady]);

  useEffect(() => {
    if (guidedTourReplayToken === 0) return;
    if (route.page !== PAGE.HOME || !settingsReady) return;
    setStepIndex(0);
    setCelebrating(false);
    setFinishingFade(false);
    setPhase('tour');
  }, [guidedTourReplayToken, route.page, settingsReady]);

  const handleLanguageChange = useCallback(
    (nextLanguage: AppLanguage) => {
      updateSetting('language', nextLanguage);
    },
    [updateSetting],
  );

  const handleLanguageConfirm = useCallback(
    (nextLanguage: AppLanguage) => {
      updateSetting('language', nextLanguage);
      void storage.set({ [SK.portalLanguagePickerDone]: true }).then(() => {
        setStepIndex(0);
        setPhase('tour');
      });
    },
    [updateSetting],
  );

  const updateViewport = useCallback(() => {
    const next = { w: window.innerWidth, h: window.innerHeight };
    setViewport((current) => (current.w === next.w && current.h === next.h ? current : next));
  }, []);

  const commitHole = useCallback((next: Hole | null) => {
    setHole((current) => (sameHole(current, next) ? current : next));
  }, []);

  const currentStep = steps[stepIndex];

  const refreshHole = useCallback(() => {
    if (!currentStep || phase !== 'tour' || currentStep.kind !== 'spotlight') {
      commitHole(null);
      return;
    }
    commitHole(readSpotlightHole(currentStep, overlayRoot));
  }, [commitHole, currentStep, overlayRoot, phase]);

  const finishTour = useCallback(() => {
    if (dockTransitionTimerRef.current !== null) {
      window.clearTimeout(dockTransitionTimerRef.current);
      dockTransitionTimerRef.current = null;
    }
    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }
    void storage.set({ [SK.portalGuidedTourDone]: true });
    overlayRoot.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setCelebrating(false);
    setFinishingFade(false);
    setPhase('off');
  }, [overlayRoot]);

  const celebrateAndFinishTour = useCallback(() => {
    if (celebrating) return;
    void storage.set({ [SK.portalGuidedTourDone]: true });
    setCelebrating(true);
    celebrationTimerRef.current = window.setTimeout(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        celebrationTimerRef.current = null;
        overlayRoot.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        setPhase('off');
        return;
      }
      setFinishingFade(true);
      celebrationTimerRef.current = window.setTimeout(() => {
        celebrationTimerRef.current = null;
        overlayRoot.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        setPhase('off');
      }, FINISH_FADE_MS);
    }, FINISH_WAIT_MS);
  }, [celebrating, overlayRoot]);

  const moveToStep = useCallback(
    (nextIndex: number) => {
      if (dockExiting) return;
      const boundedIndex = Math.min(steps.length - 1, Math.max(0, nextIndex));
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!isSetupDockStep(currentStep) || reduceMotion) {
        setStepIndex(boundedIndex);
        return;
      }
      setDockExiting(true);
      dockTransitionTimerRef.current = window.setTimeout(() => {
        dockTransitionTimerRef.current = null;
        setStepIndex(boundedIndex);
        setDockExiting(false);
      }, DOCK_EXIT_MS);
    },
    [currentStep, dockExiting, steps.length],
  );

  const goNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      finishTour();
      return;
    }
    moveToStep(stepIndex + 1);
  }, [finishTour, moveToStep, stepIndex, steps.length]);

  const goBack = useCallback(() => {
    moveToStep(stepIndex - 1);
  }, [moveToStep, stepIndex]);

  useEffect(
    () => () => {
      if (dockTransitionTimerRef.current !== null) {
        window.clearTimeout(dockTransitionTimerRef.current);
      }
      if (celebrationTimerRef.current !== null) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    updateViewport();
  }, [updateViewport, phase, stepIndex]);

  useLayoutEffect(() => {
    if (phase !== 'tour' || !currentStep) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (
      currentStep.kind === 'theme' ||
      currentStep.kind === 'weekStart' ||
      currentStep.kind === 'character'
    ) {
      scrollThemePreviewToCalendar(overlayRoot, reduceMotion ? 'auto' : 'smooth');
      return;
    }
    if (currentStep.kind === 'done') {
      overlayRoot.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [currentStep, overlayRoot, phase]);

  useLayoutEffect(() => {
    if (phase !== 'tour' || !currentStep) return;
    retryRef.current = 0;
    outlinedTargetRef.current?.classList.remove('p-tour-target-outline');
    outlinedTargetRef.current = null;

    if (currentStep.kind !== 'spotlight') {
      commitHole(null);
      return;
    }

    const target = querySpotlightElement(currentStep, overlayRoot);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const keepCurrentScroll = [
      'calendar-mode',
      'kogi-hover',
      'kogi-context',
      'assignment',
    ].includes(currentStep.id);
    if (target) {
      if (CALENDAR_OVERVIEW_STEP_IDS.has(currentStep.id)) {
        target.classList.add('p-tour-target-outline');
        outlinedTargetRef.current = target;
      }
      if (!keepCurrentScroll) {
        scrollSpotlightToOverlayCenter(target, overlayRoot, reduceMotion ? 'auto' : 'smooth');
      }
    }
    commitHole(readSpotlightHole(currentStep, overlayRoot));

    let settleTimer: number | null = null;
    if (target && !reduceMotion && !keepCurrentScroll) {
      settleTimer = window.setTimeout(() => {
        updateViewport();
        commitHole(readSpotlightHole(currentStep, overlayRoot));
      }, SCROLL_SETTLE_MS);
    }
    return () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      target?.classList.remove('p-tour-target-outline');
      if (outlinedTargetRef.current === target) outlinedTargetRef.current = null;
    };
  }, [commitHole, currentStep, overlayRoot, phase, updateViewport]);

  useEffect(() => {
    if (phase !== 'tour' || currentStep?.kind !== 'spotlight') return;
    let frame = 0;
    const onResize = () => {
      updateViewport();
      refreshHole();
    };
    const onScroll = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        refreshHole();
      });
    };
    window.addEventListener('resize', onResize);
    overlayRoot.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      overlayRoot.removeEventListener('scroll', onScroll, true);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [currentStep, overlayRoot, phase, refreshHole, updateViewport]);

  useEffect(() => {
    if (phase !== 'tour' || currentStep?.kind !== 'spotlight') return;
    if (hole !== null) {
      retryRef.current = 0;
      return;
    }
    if (retryRef.current >= HOLE_RETRY_MAX) return;
    retryRef.current += 1;
    const timer = window.setTimeout(() => {
      commitHole(readSpotlightHole(currentStep, overlayRoot));
    }, HOLE_RETRY_MS);
    return () => window.clearTimeout(timer);
  }, [commitHole, currentStep, hole, overlayRoot, phase]);

  useLayoutEffect(() => {
    if (phase !== 'tour') return;
    const card = cardRef.current;
    if (!card) return;
    const measure = () => {
      const r = card.getBoundingClientRect();
      setCardSize((current) =>
        current.w === r.width && current.h === r.height ? current : { w: r.width, h: r.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [phase, stepIndex]);

  useLayoutEffect(() => {
    if (phase !== 'tour') return;
    const primary = cardRef.current?.querySelector('button.p-tour-primary');
    if (primary instanceof HTMLElement) primary.focus();
  }, [phase, stepIndex]);

  useEffect(() => {
    if (phase !== 'tour') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      finishTour();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [finishTour, phase]);

  if (phase === 'language') {
    return (
      <LanguagePicker
        initialLanguage={settings.language}
        onChange={handleLanguageChange}
        onConfirm={handleLanguageConfirm}
      />
    );
  }

  if (phase !== 'tour' || !currentStep) return null;

  const findCopy = (id: string) => t.guidedTour.steps.find((item) => item.id === id);
  const copy = findCopy(currentStep.id);
  const isLast = stepIndex === steps.length - 1;
  const vw = viewport.w || (typeof window !== 'undefined' ? window.innerWidth : 400);
  const vh = viewport.h || (typeof window !== 'undefined' ? window.innerHeight : 600);

  const spotlightCardStyle: CSSProperties | undefined = (() => {
    if (currentStep.kind !== 'spotlight') return undefined;
    const margin = 12;
    const gap = 14;
    const width = Math.min(360, vw - margin * 2);
    const height = cardSize.h || 220;
    if (hole && CALENDAR_OVERVIEW_STEP_IDS.has(currentStep.id)) {
      const inset = 14;
      const calendarWidth = Math.min(width, Math.max(280, hole.w - inset * 2));
      const left = Math.max(
        margin,
        Math.min(hole.x + hole.w - calendarWidth - inset, vw - calendarWidth - margin),
      );
      const top =
        hole.h >= height + inset * 2
          ? Math.max(margin, Math.min(hole.y + hole.h - height - inset, vh - height - margin))
          : Math.max(margin, vh - height - margin);
      return { left, top, width: calendarWidth };
    }
    if (!hole) {
      return {
        left: '50%',
        bottom: '12%',
        width,
        transform: 'translateX(-50%)',
      };
    }
    if (currentStep.id === 'shortcuts') {
      const availableLeft = hole.x - gap - margin;
      if (availableLeft >= 240) {
        const shortcutCardWidth = Math.min(width, availableLeft);
        const left = hole.x - gap - shortcutCardWidth;
        const top = Math.max(
          margin,
          Math.min(hole.y + hole.h / 2 - height / 2, vh - height - margin),
        );
        return { left, top, width: shortcutCardWidth };
      }
    }

    const below = hole.y + hole.h + gap;
    const top = below + height <= vh - margin ? below : Math.max(margin, hole.y - height - gap);
    const left = Math.max(margin, Math.min(hole.x + hole.w / 2 - width / 2, vw - width - margin));
    return { left, top, width };
  })();

  const showSpotlightSvg = currentStep.kind === 'spotlight' && vw > 0 && vh > 0 && hole !== null;

  const renderProgress = () => (
    <div className="p-tour-progress" aria-hidden>
      <span className="p-tour-progress-count">
        {stepIndex + 1}
        <span>/</span>
        {steps.length}
      </span>
      <span className="p-tour-progress-track">
        <span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
      </span>
    </div>
  );

  const renderActions = () => (
    <div className="p-tour-card-actions">
      <div className="p-tour-card-actions-secondary">
        {stepIndex > 0 ? (
          <button type="button" className="p-tour-back" onClick={goBack}>
            {t.guidedTour.back}
          </button>
        ) : null}
        {!isLast ? (
          <button type="button" className="p-tour-skip" onClick={finishTour}>
            {t.guidedTour.skip}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="p-tour-primary"
        disabled={celebrating}
        aria-busy={celebrating}
        aria-label={isLast ? t.guidedTour.primaryDone : undefined}
        onClick={isLast ? celebrateAndFinishTour : goNext}
      >
        {celebrating ? (
          <span className="p-tour-finish-spinner" aria-hidden />
        ) : isLast ? (
          t.guidedTour.primaryDone
        ) : (
          t.common.next
        )}
      </button>
    </div>
  );

  const renderPreviewScrollGuard = () => (
    <div
      className="p-tour-theme-guard"
      aria-hidden
      onWheel={(event) => {
        event.preventDefault();
        overlayRoot.scrollBy({ top: event.deltaY, left: 0, behavior: 'auto' });
      }}
    />
  );

  if (currentStep.kind === 'theme') {
    const allThemes = Object.entries(THEMES);
    const recommended = RECOMMENDED_THEME_KEYS.flatMap((key) =>
      THEMES[key] ? [[key, THEMES[key]] as const] : [],
    );
    const recommendedKeys = new Set<string>(RECOMMENDED_THEME_KEYS);
    const otherThemes = allThemes.filter(([key]) => !recommendedKeys.has(key));
    const renderThemeOptions = (themes: readonly (readonly [string, ThemeTokens])[]) =>
      themes.map(([key, meta]) => {
        const name = themeDisplayName(key, meta.name, language);
        const active = settings.theme === key;
        const previewStyle: ThemePreviewStyle = {
          '--p-tour-preview-bg': meta.bg,
          '--p-tour-preview-bg2': meta.bgSecondary,
          '--p-tour-preview-text': meta.textBright,
          '--p-tour-preview-accent': meta.accent,
          '--p-tour-preview-border': meta.borderHover,
        };
        return (
          <button
            key={key}
            type="button"
            className={`p-tour-theme-option${active ? ' is-active' : ''}`}
            style={previewStyle}
            aria-label={name}
            aria-pressed={active}
            onClick={() => updateTheme(key)}
          >
            <span className="p-tour-theme-option-preview" aria-hidden>
              <span className="p-tour-theme-option-window">
                <span />
                <span />
              </span>
              <span className="p-tour-theme-option-accent" />
            </span>
            <span className="p-tour-theme-option-name">{name}</span>
            {active ? (
              <span className="p-tour-theme-option-check" aria-hidden>
                ✓
              </span>
            ) : null}
          </button>
        );
      });

    return (
      <div className="p-tour-root p-tour-root--theme">
        {renderPreviewScrollGuard()}
        <div
          key={currentStep.id}
          ref={cardRef}
          className={`p-tour-theme-dock p-tour-theme-selection-dock${dockExiting ? ' is-exiting' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="p-tour-theme-title"
          aria-describedby="p-tour-theme-body"
        >
          <div className="p-tour-theme-dock-inner">
            <div className="p-tour-theme-copy">
              <div>
                <span className="p-tour-eyebrow">{t.guidedTour.themeEyebrow}</span>
                <h2 id="p-tour-theme-title">{t.guidedTour.themeTitle}</h2>
                <p id="p-tour-theme-body">{t.guidedTour.themeBody}</p>
              </div>
              {renderProgress()}
            </div>

            <div className="p-tour-theme-lists">
              <section>
                <div className="p-tour-theme-picker-head">
                  <span>{t.guidedTour.themeRecommended}</span>
                </div>
                <div className="p-tour-theme-grid p-tour-theme-grid--recommended">
                  {renderThemeOptions(recommended)}
                </div>
              </section>
              <section>
                <div className="p-tour-theme-picker-head">
                  <span>{t.guidedTour.themeOther}</span>
                </div>
                <div className="p-tour-theme-grid">{renderThemeOptions(otherThemes)}</div>
              </section>
            </div>

            <div className="p-tour-theme-footer">
              <p>
                {t.guidedTour.themeHint}{' '}
                {language === 'ja'
                  ? '設定では、独自テーマも作成できます。'
                  : 'You can also create a custom theme later in Settings.'}
              </p>
              {renderActions()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep.kind === 'weekStart') {
    return (
      <div className="p-tour-root p-tour-root--theme">
        {renderPreviewScrollGuard()}
        <div
          key={currentStep.id}
          ref={cardRef}
          className={`p-tour-theme-dock p-tour-week-start-dock${dockExiting ? ' is-exiting' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="p-tour-week-start-title"
          aria-describedby="p-tour-week-start-body"
        >
          <div className="p-tour-theme-dock-inner">
            <div className="p-tour-theme-copy">
              <div>
                <span className="p-tour-eyebrow">{t.guidedTour.themeEyebrow}</span>
                <h2 id="p-tour-week-start-title">{t.settings.calendarWeekStart}</h2>
                <p id="p-tour-week-start-body">{t.guidedTour.weekStartBody}</p>
              </div>
              {renderProgress()}
            </div>

            <div
              className="p-tour-week-start-options"
              role="radiogroup"
              aria-label={t.settings.calendarWeekStart}
            >
              <button
                type="button"
                role="radio"
                aria-checked={settings.calendarWeekStart === 'monday'}
                className={`p-tour-week-start-option${settings.calendarWeekStart === 'monday' ? ' is-active' : ''}`}
                onClick={() => updateSetting('calendarWeekStart', 'monday')}
              >
                <span className="p-tour-week-start-days" aria-hidden>
                  {t.calendar.weekdaysMonday.map((day, index) => (
                    <span className={index === 0 ? 'is-first' : undefined} key={day}>
                      {day}
                    </span>
                  ))}
                </span>
                <span>{t.settings.weekStartMonday}</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={settings.calendarWeekStart === 'sunday'}
                className={`p-tour-week-start-option${settings.calendarWeekStart === 'sunday' ? ' is-active' : ''}`}
                onClick={() => updateSetting('calendarWeekStart', 'sunday')}
              >
                <span className="p-tour-week-start-days" aria-hidden>
                  {t.calendar.weekdaysSunday.map((day, index) => (
                    <span className={index === 0 ? 'is-first' : undefined} key={day}>
                      {day}
                    </span>
                  ))}
                </span>
                <span>{t.settings.weekStartSunday}</span>
              </button>
            </div>

            <div className="p-tour-theme-footer p-tour-week-start-footer">
              <p>{t.guidedTour.weekStartHint}</p>
              {renderActions()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep.kind === 'character') {
    return (
      <div className="p-tour-root p-tour-root--theme p-tour-root--character">
        {renderPreviewScrollGuard()}
        <div
          key={currentStep.id}
          ref={cardRef}
          className={`p-tour-theme-dock p-tour-week-start-dock${dockExiting ? ' is-exiting' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="p-tour-character-title"
          aria-describedby="p-tour-character-body"
        >
          <div className="p-tour-theme-dock-inner">
            <div className="p-tour-theme-copy">
              <div>
                <span className="p-tour-eyebrow">{t.guidedTour.themeEyebrow}</span>
                <h2 id="p-tour-character-title">{t.settings.homeDecoration}</h2>
                <p id="p-tour-character-body">{t.settings.showHomeCornerCharacter}</p>
              </div>
              {renderProgress()}
            </div>

            <div
              className="p-tour-week-start-options p-tour-character-options"
              role="radiogroup"
              aria-label={t.settings.showHomeCornerCharacter}
            >
              <button
                type="button"
                role="radio"
                aria-checked={settings.showHomeCornerCharacter}
                className={`p-tour-week-start-option p-tour-character-option${settings.showHomeCornerCharacter ? ' is-active' : ''}`}
                onClick={() => updateSetting('showHomeCornerCharacter', true)}
              >
                <span className="p-tour-character-preview" aria-hidden>
                  <span className="p-tour-character-preview-panel" />
                  <img src={homeCornerCharacterUrl} alt="" />
                </span>
                <span>{t.common.show}</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!settings.showHomeCornerCharacter}
                className={`p-tour-week-start-option p-tour-character-option${!settings.showHomeCornerCharacter ? ' is-active' : ''}`}
                onClick={() => updateSetting('showHomeCornerCharacter', false)}
              >
                <span className="p-tour-character-preview is-hidden" aria-hidden>
                  <span className="p-tour-character-preview-panel" />
                </span>
                <span>{t.common.hide}</span>
              </button>
            </div>

            <div className="p-tour-theme-footer p-tour-week-start-footer">
              {mascotIllustratorName && mascotIllustratorUrl ? (
                <p className="p-tour-character-credit">
                  Illustration by{' '}
                  <a href={mascotIllustratorUrl} target="_blank" rel="noopener noreferrer">
                    {mascotIllustratorName}
                  </a>
                </p>
              ) : (
                <p>{t.settings.showHomeCornerCharacter}</p>
              )}
              {renderActions()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-tour-root${finishingFade ? ' is-finishing' : ''}`}>
      {currentStep.kind !== 'spotlight' ? (
        <div key={stepIndex} className="p-tour-dim-full" aria-hidden />
      ) : null}

      {currentStep.kind === 'spotlight' && !showSpotlightSvg ? (
        <div key={`${stepIndex}-spot-wait`} className="p-tour-dim-full" aria-hidden />
      ) : null}

      {showSpotlightSvg ? (
        <svg
          key={stepIndex}
          className="p-tour-svg"
          viewBox={`0 0 ${vw} ${vh}`}
          width={vw}
          height={vh}
          aria-hidden
        >
          <defs>
            <mask id={maskId}>
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={hole!.x}
                y={hole!.y}
                width={hole!.w}
                height={hole!.h}
                rx={16}
                ry={16}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(6,8,16,0.54)" mask={`url(#${maskId})`} />
          <rect
            className="p-tour-spot-ring"
            x={hole!.x}
            y={hole!.y}
            width={hole!.w}
            height={hole!.h}
            rx={16}
            ry={16}
            fill="none"
            stroke="var(--p-accent-light)"
            strokeWidth={3}
          />
        </svg>
      ) : null}

      {currentStep.kind === 'welcome' ? (
        <div
          ref={cardRef}
          className="p-tour-card p-tour-card--center p-tour-welcome-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="p-tour-h-welcome"
        >
          <div className="p-tour-card-inner">
            <div className="p-tour-card-topline">
              <span className="p-tour-eyebrow">{t.guidedTour.welcomeEyebrow}</span>
              {renderProgress()}
            </div>
            <h2 id="p-tour-h-welcome">{copy?.title}</h2>
            <p>{copy?.body}</p>
            <div className="p-tour-feature-grid">
              {t.guidedTour.welcomeFeatures.map((label, index) => (
                <div className="p-tour-feature" key={label}>
                  <span aria-hidden>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{label}</strong>
                </div>
              ))}
            </div>
            {renderActions()}
          </div>
        </div>
      ) : null}

      {currentStep.kind === 'done' ? (
        <div
          ref={cardRef}
          className="p-tour-card p-tour-card--center p-tour-done-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="p-tour-h-done"
        >
          <div className="p-tour-card-inner">
            <div className="p-tour-done-mark" aria-hidden>
              ✓
            </div>
            {renderProgress()}
            <h2 id="p-tour-h-done">{copy?.title}</h2>
            <p>{copy?.body}</p>
            {renderActions()}
          </div>
        </div>
      ) : null}

      {currentStep.kind === 'spotlight' ? (
        <div
          ref={cardRef}
          className="p-tour-card p-tour-spotlight-card"
          style={spotlightCardStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`p-tour-h-${currentStep.id}`}
        >
          <div className="p-tour-card-inner" key={stepIndex}>
            <div className="p-tour-card-topline">
              <span className="p-tour-eyebrow">{t.guidedTour.guideEyebrow}</span>
              {renderProgress()}
            </div>
            <h2 id={`p-tour-h-${currentStep.id}`}>{copy?.title}</h2>
            <p>{copy?.body}</p>
            {renderActions()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
