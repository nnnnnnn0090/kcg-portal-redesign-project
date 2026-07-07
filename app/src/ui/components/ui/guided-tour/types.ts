export type TourPhase = 'loading' | 'language' | 'tour' | 'off';

export type TourStep =
  | {
      kind: 'welcome' | 'theme' | 'weekStart' | 'character' | 'done';
      id: string;
    }
  | {
      kind: 'spotlight';
      id: string;
      selector: string;
      selectorFallback?: string;
    };

export interface Hole {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GuidedTourProps {
  route: import('../../../../domain/portal/router').PortalRoute;
  settingsReady: boolean;
  hideAssignmentCalendar?: boolean;
  guidedTourReplayToken?: number;
}
