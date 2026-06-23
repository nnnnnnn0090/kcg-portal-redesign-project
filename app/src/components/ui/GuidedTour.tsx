/**
 * 初回ホーム表示時の誘導チュートリアル。
 * 周囲を暗くし、操作してほしい場所を枠で示す。
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
  type ReactNode,
} from 'react';
import { PAGE, SK } from '../../shared/constants';
import type { PortalRoute } from '../../portal/router';
import storage from '../../lib/storage';
import { usePortalDom } from '../../context/portalDom';
import { useI18n } from '../../i18n';

type TourPhase = 'loading' | 'off' | 'on';

type TourStep =
{
  kind:   'card';
  id:     string;
  title:  string;
  body:   string;
}
| {
  kind:               'spotlight';
  id:                 string;
  title:              string;
  body:               string;
  selector:           string;
  /** 主セレクタが DOM に無いとき（例: リンク非表示）のフォールバック */
  selectorFallback?: string;
};

const STEPS: TourStep[] = [
  {
    kind:   'card',
    id:     'welcome',
    title:  '',
    body:   '',
  },
  {
    kind:     'spotlight',
    id:       'settings',
    title:    '',
    body:     '',
    selector: '#p-open-settings',
  },
  {
    kind:     'spotlight',
    id:       'assignment',
    title:    '',
    body:     '',
    selector: '#p-assignment-refresh-btn',
  },
  {
    kind:               'spotlight',
    id:                 'kogi',
    title:              '',
    body:               '',
    selector:           'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-ev[data-cal-kind="kogi"]',
    selectorFallback:   'section.p-panel-cal[data-cal-kind="kogi"]',
  },
  {
    kind:               'spotlight',
    id:                 'kogi-context',
    title:              '',
    body:               '',
    selector:           'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-ev[data-cal-kind="kogi"]',
    selectorFallback:   'section.p-panel-cal[data-cal-kind="kogi"]',
  },
  {
    kind:     'spotlight',
    id:       'shortcuts',
    title:    '',
    body:     '',
    selector: 'section.p-panel.p-panel-links',
  },
  {
    kind:               'spotlight',
    id:                 'attendance',
    title:              '',
    body:               '',
    selector:           '#p-shortcut-attendance',
    selectorFallback:   '#p-links',
  },
  {
    kind:               'spotlight',
    id:                 'webmail',
    title:              '',
    body:               '',
    selector:           '#p-shortcut-webmail',
    selectorFallback:   '#p-links',
  },
  {
    kind:   'card',
    id:     'done',
    title:  '',
    body:   '',
  },
];

/** 「課題を確認」スポットライトのインデックス（`hideAssignmentCalendar` でステップが外れるときに同期する） */
const ASSIGNMENT_TOUR_STEP_INDEX = STEPS.findIndex((s) => s.id === 'assignment');

const HOLE_PAD                      = 10;
const MIN_SPOTLIGHT_EL_PX           = 2;
const SCROLL_INTO_VIEW_SUPPLEMENT_MS = 420;
const HOLE_RETRY_MS                 = 100;
const HOLE_RETRY_MAX                = 15;
const SPOTLIGHT_CARD_EST_HEIGHT_PX  = 220;

interface Hole {
  x: number;
  y: number;
  w: number;
  h: number;
}

function readHole(selector: string, root: Document | HTMLElement): Hole | null {
  const el = root.querySelector(selector);
  if (!(el instanceof HTMLElement)) return null;
  const r = el.getBoundingClientRect();
  if (r.width < MIN_SPOTLIGHT_EL_PX || r.height < MIN_SPOTLIGHT_EL_PX) return null;
  return {
    x:  r.left - HOLE_PAD,
    y:  r.top - HOLE_PAD,
    w:  r.width + HOLE_PAD * 2,
    h:  r.height + HOLE_PAD * 2,
  };
}

function readSpotlightHole(step: Extract<TourStep, { kind: 'spotlight' }>, root: HTMLElement): Hole | null {
  return readHole(step.selector, root)
    ?? (step.selectorFallback ? readHole(step.selectorFallback, root) : null);
}

/** スポットライトのフォーカス要素（スクロール先）。`readSpotlightHole` と同じ優先順。 */
function querySpotlightElement(step: Extract<TourStep, { kind: 'spotlight' }>, root: HTMLElement): HTMLElement | null {
  const pick = (selector: string): HTMLElement | null => {
    const el = root.querySelector(selector);
    if (!(el instanceof HTMLElement)) return null;
    const r = el.getBoundingClientRect();
    return r.width >= MIN_SPOTLIGHT_EL_PX && r.height >= MIN_SPOTLIGHT_EL_PX ? el : null;
  };
  return pick(step.selector) ?? (step.selectorFallback ? pick(step.selectorFallback) : null);
}

function tourCardBody(
  step: TourStep,
  stepIndex: number,
  totalSteps: number,
  isLast: boolean,
  title: string,
  body: string,
  primaryLabel: string,
  skipLabel: string,
  goNext: () => void,
  finishTour: () => void,
): ReactNode {
  const showSkip = step.kind === 'spotlight' || !isLast;
  return (
    <div className="p-tour-card-inner" key={stepIndex}>
      <h2 id={`p-tour-h-${step.id}`}>{title}</h2>
      <p>{body}</p>
      <div className="p-tour-card-actions">
        <button type="button" className="p-tour-primary" onClick={goNext}>
          {primaryLabel}
        </button>
        {showSkip && (
          <button type="button" className="p-tour-skip" onClick={finishTour}>
            {skipLabel}
          </button>
        )}
      </div>
      <div className="p-tour-progress" aria-hidden>
        {stepIndex + 1} / {totalSteps}
      </div>
    </div>
  );
}

export interface GuidedTourProps {
  route:                  PortalRoute;
  settingsReady:          boolean;
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
  const { t } = useI18n();
  const { overlayRoot } = usePortalDom();
  const steps = useMemo(
    () => (hideAssignmentCalendar
      ? STEPS.filter((s) => s.id !== 'assignment')
      : STEPS),
    [hideAssignmentCalendar],
  );
  const [phase, setPhase] = useState<TourPhase>('loading');
  const [stepIndex, setStepIndex] = useState(0);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [hole, setHole] = useState<Hole | null>(null);
  const maskSuffix = useId().replace(/:/g, '');
  const maskId     = `p-tour-mask-${maskSuffix}`;
  const cardRef    = useRef<HTMLDivElement>(null);
  const retryRef   = useRef(0);

  useEffect(() => {
    if (route.page !== PAGE.HOME || !settingsReady) {
      setPhase('off');
      return;
    }
    let cancelled = false;
    void storage.get(SK.portalGuidedTourDone).then((d) => {
      if (cancelled) return;
      if (d[SK.portalGuidedTourDone]) setPhase('off');
      else setPhase('on');
    });
    return () => { cancelled = true; };
  }, [route.page, settingsReady]);

  useEffect(() => {
    if (guidedTourReplayToken === 0) return;
    if (route.page !== PAGE.HOME || !settingsReady) return;
    setStepIndex(0);
    setPhase('on');
  }, [guidedTourReplayToken, route.page, settingsReady]);

  const prevHideAssignmentRef = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    if (ASSIGNMENT_TOUR_STEP_INDEX < 0) return;
    if (prevHideAssignmentRef.current === null) {
      prevHideAssignmentRef.current = hideAssignmentCalendar;
      return;
    }
    if (prevHideAssignmentRef.current === hideAssignmentCalendar) return;
    prevHideAssignmentRef.current = hideAssignmentCalendar;

    setStepIndex((i) => {
      let n = i;
      if (hideAssignmentCalendar) {
        if (i > ASSIGNMENT_TOUR_STEP_INDEX) n = i - 1;
      } else if (i >= ASSIGNMENT_TOUR_STEP_INDEX) {
        n = i + 1;
      }
      return Math.max(0, Math.min(n, steps.length - 1));
    });
  }, [hideAssignmentCalendar, steps.length]);

  const updateViewport = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  const refreshHole = useCallback(() => {
    const step = steps[stepIndex];
    if (!step || phase !== 'on' || step.kind !== 'spotlight') {
      setHole(null);
      return;
    }
    setHole(readSpotlightHole(step, overlayRoot));
  }, [phase, stepIndex, overlayRoot, steps]);

  useLayoutEffect(() => {
    updateViewport();
  }, [updateViewport, phase, stepIndex]);

  useLayoutEffect(() => {
    if (phase !== 'on') return;
    const step = steps[stepIndex];
    if (!step || step.kind !== 'card' || step.id !== 'done') return;
    overlayRoot.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [phase, stepIndex, overlayRoot, steps]);

  useLayoutEffect(() => {
    if (phase !== 'on') return;
    const step = steps[stepIndex];
    if (!step) return;
    retryRef.current = 0;

    if (step.kind !== 'spotlight') {
      refreshHole();
      return;
    }

    const target = querySpotlightElement(step, overlayRoot);
    if (target) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({
        block:    'nearest',
        inline:   'nearest',
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }
    refreshHole();

    if (target && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t = window.setTimeout(() => {
        updateViewport();
        refreshHole();
      }, SCROLL_INTO_VIEW_SUPPLEMENT_MS);
      return () => window.clearTimeout(t);
    }
  }, [refreshHole, viewport, stepIndex, phase, overlayRoot, updateViewport, steps]);

  useEffect(() => {
    if (phase !== 'on') return;
    const onResizeOrScroll = () => {
      updateViewport();
      refreshHole();
    };
    window.addEventListener('resize', onResizeOrScroll);
    overlayRoot.addEventListener('scroll', onResizeOrScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      overlayRoot.removeEventListener('scroll', onResizeOrScroll, true);
    };
  }, [phase, overlayRoot, updateViewport, refreshHole]);

  useEffect(() => {
    if (phase !== 'on') return;
    const step = steps[stepIndex];
    if (!step || step.kind !== 'spotlight') return;
    if (hole !== null) {
      retryRef.current = 0;
      return;
    }
    if (retryRef.current >= HOLE_RETRY_MAX) return;
    retryRef.current += 1;
    const t = window.setTimeout(() => {
      setHole(readSpotlightHole(step, overlayRoot));
    }, HOLE_RETRY_MS);
    return () => window.clearTimeout(t);
  }, [phase, stepIndex, hole, overlayRoot, steps]);

  useLayoutEffect(() => {
    if (phase !== 'on') return;
    const btn = cardRef.current?.querySelector('button.p-tour-primary');
    if (btn instanceof HTMLElement) btn.focus();
  }, [phase, stepIndex]);

  const finishTour = useCallback(() => {
    void storage.set({ [SK.portalGuidedTourDone]: true });
    setPhase('off');
  }, []);

  const goNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      finishTour();
      return;
    }
    setStepIndex((s) => s + 1);
  }, [stepIndex, finishTour, steps.length]);

  if (phase !== 'on') return null;

  const step = steps[stepIndex];
  if (!step) return null;

  const isLast = stepIndex === steps.length - 1;
  const primaryLabel = isLast ? t.guidedTour.primaryDone : t.common.next;
  const copy = t.guidedTour.steps.find((s) => s.id === step.id);
  const stepTitle = copy?.title ?? step.title;
  const stepBody = copy?.body ?? step.body;

  const vw = viewport.w || (typeof window !== 'undefined' ? window.innerWidth : 400);
  const vh = viewport.h || (typeof window !== 'undefined' ? window.innerHeight : 600);

  const spotlightCardStyle: CSSProperties | undefined = (() => {
    if (step.kind !== 'spotlight') return undefined;
    const cardW = Math.min(360, vw - 24);
    if (!hole) {
      return {
        position:  'fixed',
        bottom:    '12%',
        left:      '50%',
        transform: 'translateX(-50%)',
        width:     cardW,
      };
    }
    const estH = SPOTLIGHT_CARD_EST_HEIGHT_PX;
    let top = hole.y + hole.h + 14;
    if (top + estH > vh - 16) top = Math.max(12, hole.y - estH - 14);
    let left = hole.x + hole.w / 2 - cardW / 2;
    left = Math.max(12, Math.min(left, vw - cardW - 12));
    return {
      position:  'fixed',
      top,
      left,
      width:     cardW,
      transform: 'none',
    };
  })();

  const showSpotlightSvg = step.kind === 'spotlight' && vw > 0 && vh > 0 && hole !== null;

  return (
    <div className="p-tour-root" aria-hidden={false}>
      {step.kind === 'card' && <div key={stepIndex} className="p-tour-dim-full" aria-hidden />}

      {step.kind === 'spotlight' && !showSpotlightSvg && (
        <div key={`${stepIndex}-spot-wait`} className="p-tour-dim-full" aria-hidden />
      )}

      {showSpotlightSvg && (
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
                rx={14}
                ry={14}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(8,10,18,0.42)" mask={`url(#${maskId})`} />
          <rect
            className="p-tour-spot-ring"
            x={hole!.x}
            y={hole!.y}
            width={hole!.w}
            height={hole!.h}
            rx={14}
            ry={14}
            fill="none"
            stroke="rgba(255,255,255,0.92)"
            strokeWidth={3}
          />
        </svg>
      )}

      {step.kind === 'card' && (
        <div
          ref={cardRef}
          className="p-tour-card p-tour-card--center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`p-tour-h-${step.id}`}
        >
          {tourCardBody(
            step,
            stepIndex,
            steps.length,
            isLast,
            stepTitle,
            stepBody,
            primaryLabel,
            t.guidedTour.end,
            goNext,
            finishTour,
          )}
        </div>
      )}

      {step.kind === 'spotlight' && (
        <div
          ref={cardRef}
          className="p-tour-card"
          style={spotlightCardStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`p-tour-h-${step.id}`}
        >
          {tourCardBody(
            step,
            stepIndex,
            steps.length,
            isLast,
            stepTitle,
            stepBody,
            primaryLabel,
            t.guidedTour.end,
            goNext,
            finishTour,
          )}
        </div>
      )}
    </div>
  );
}
