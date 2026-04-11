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
  useRef,
  type CSSProperties,
} from 'react';
import { PAGE, SK } from '../../shared/constants';
import type { PortalRoute } from '../../portal/router';
import storage from '../../lib/storage';
import { usePortalDom } from '../../context/portalDom';

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
    title:  'ようこそ',
    body:   '「KCG Portal Redesign Project」をインストールしていただき、ありがとうございます。\n\nここでは、よく使う機能を中心に、短くご案内します。',
  },
  {
    kind:     'spotlight',
    id:       'settings',
    title:    'まずはここ：設定',
    body:     '右上のこのボタンから開けます。\n\nテーマカラーの変更や、コース一覧の再取得（King LMSとの連携）などが行えます。',
    selector: '#p-open-settings',
  },
  {
    kind:     'spotlight',
    id:       'assignment',
    title:    '課題を確認するには',
    body:     'このボタンから King LMS の課題を取り込めます。\n\n初回は一度押しておくのがおすすめです。',
    selector: '#p-assignment-refresh-btn',
  },
  {
    kind:               'spotlight',
    id:                 'kogi',
    title:              '授業カレンダー',
    body:               '各講義をクリックすると、King LMS のコースページへ直接移動できます。\n\n初回はコース一覧の取得が必要な場合があります（その際は案内が表示されます）。',
    selector:           'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-ev[data-cal-kind="kogi"]',
    selectorFallback:   'section.p-panel-cal[data-cal-kind="kogi"]',
  },
  {
    kind:               'spotlight',
    id:                 'kogi-context',
    title:              '講義を右クリック',
    body:               '授業カレンダー上の講義を右クリックすると、シラバスや King LMS のコースを別タブで開くメニューが表示されます。\n\n左クリックはコースページへの直行、右クリックはメニューから選ぶ動きです。',
    selector:           'section.p-panel-cal[data-cal-kind="kogi"] .p-cal-ev[data-cal-kind="kogi"]',
    selectorFallback:   'section.p-panel-cal[data-cal-kind="kogi"]',
  },
  {
    kind:     'spotlight',
    id:       'shortcuts',
    title:    'ショートカット',
    body:     'よく使うページへのリンクをまとめられます。「編集」から、並べ替え・非表示・独自リンクの追加ができます。',
    selector: 'section.p-panel.p-panel-links',
  },
  {
    kind:               'spotlight',
    id:                 'attendance',
    title:              '出欠登録',
    body:               '「学生出欠登録」から出欠の申請画面へ進めます。表示されないときは「編集」で一覧を開き、非表示になっていないか確認してください。',
    selector:           '#p-shortcut-attendance',
    selectorFallback:   '#p-links',
  },
  {
    kind:   'card',
    id:     'done',
    title:  '以上です',
    body:   '困ったときは「設定」からいつでもこの案内を確認できます。\n\n気に入ったら、ぜひ友だちにも教えてあげてください❤️',
  },
];
const HOLE_PAD = 10;

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
  if (r.width < 2 || r.height < 2) return null;
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
    return r.width >= 2 && r.height >= 2 ? el : null;
  };
  return pick(step.selector) ?? (step.selectorFallback ? pick(step.selectorFallback) : null);
}

export interface GuidedTourProps {
  route:                  PortalRoute;
  settingsReady:          boolean;
  /** 増えるたびに案内を先頭から再開する（設定の「もう一度見る」） */
  guidedTourReplayToken?: number;
}

export function GuidedTour({ route, settingsReady, guidedTourReplayToken = 0 }: GuidedTourProps) {
  const { overlayRoot } = usePortalDom();
  const [phase, setPhase] = useState<TourPhase>('loading');
  const [stepIndex, setStepIndex] = useState(0);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [hole, setHole] = useState<Hole | null>(null);
  const maskSuffix = useId().replace(/:/g, '');
  const maskId     = `p-tour-mask-${maskSuffix}`;
  const cardRef    = useRef<HTMLDivElement>(null);

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

  const updateViewport = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  const refreshHole = useCallback(() => {
    const step = STEPS[stepIndex];
    if (phase !== 'on' || step.kind !== 'spotlight') {
      setHole(null);
      return;
    }
    setHole(readSpotlightHole(step, overlayRoot));
  }, [phase, stepIndex, overlayRoot]);

  useLayoutEffect(() => {
    updateViewport();
  }, [updateViewport, phase, stepIndex]);

  /** 「以上です」は画面下から戻ってきた直後でも読みやすいよう、オーバーレイを先頭へ */
  useLayoutEffect(() => {
    if (phase !== 'on') return;
    const step = STEPS[stepIndex];
    if (step.kind !== 'card' || step.id !== 'done') return;
    overlayRoot.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [phase, stepIndex, overlayRoot]);

  useLayoutEffect(() => {
    if (phase !== 'on') return;
    const step = STEPS[stepIndex];
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
      }, 420);
      return () => window.clearTimeout(t);
    }
  }, [refreshHole, viewport, stepIndex, phase, overlayRoot, updateViewport]);

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
      overlayRoot.removeEventListener('scroll', onResizeOrScroll, { capture: true } as AddEventListenerOptions);
    };
  }, [phase, overlayRoot, updateViewport, refreshHole]);

  const retryRef = useRef(0);
  useEffect(() => {
    if (phase !== 'on') return;
    const step = STEPS[stepIndex];
    if (step.kind !== 'spotlight') return;
    if (hole !== null) {
      retryRef.current = 0;
      return;
    }
    if (retryRef.current >= 15) return;
    retryRef.current += 1;
    const t = window.setTimeout(() => {
      setHole(readSpotlightHole(step, overlayRoot));
    }, 100);
    return () => window.clearTimeout(t);
  }, [phase, stepIndex, hole, overlayRoot]);

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
    if (stepIndex >= STEPS.length - 1) {
      finishTour();
      return;
    }
    setStepIndex((s) => s + 1);
  }, [stepIndex, finishTour]);

  if (phase !== 'on') return null;

  const step = STEPS[stepIndex];
  if (!step) return null;

  const isLast = stepIndex === STEPS.length - 1;
  const primaryLabel = isLast ? 'わかった' : '次へ';

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
    const estH = 220;
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
          <div className="p-tour-card-inner" key={stepIndex}>
            <h2 id={`p-tour-h-${step.id}`}>{step.title}</h2>
            <p>{step.body}</p>
            <div className="p-tour-card-actions">
              <button type="button" className="p-tour-primary" onClick={goNext}>
                {primaryLabel}
              </button>
              {!isLast && (
                <button type="button" className="p-tour-skip" onClick={finishTour}>
                  チュートリアルを終了
                </button>
              )}
            </div>
            <div className="p-tour-progress" aria-hidden>
              {stepIndex + 1} / {STEPS.length}
            </div>
          </div>
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
          <div className="p-tour-card-inner" key={stepIndex}>
            <h2 id={`p-tour-h-${step.id}`}>{step.title}</h2>
            <p>{step.body}</p>
            <div className="p-tour-card-actions">
              <button type="button" className="p-tour-primary" onClick={goNext}>
                {primaryLabel}
              </button>
              <button type="button" className="p-tour-skip" onClick={finishTour}>
                チュートリアルを終了
              </button>
            </div>
            <div className="p-tour-progress" aria-hidden>
              {stepIndex + 1} / {STEPS.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
