/**
 * アプリ全体のコンテキストプロバイダーをまとめるラッパー。
 */

import type { ReactNode } from 'react';
import { SettingsProvider } from '../context/settings';
import { CoursesProvider }  from '../context/courses';
import { CalendarOverlayUiProvider } from '../context/calendarOverlayUi';
import { PortalDomProvider } from '../context/portalDom';

export function AppProviders({
  children,
  overlayRoot,
}: {
  children: ReactNode;
  overlayRoot: HTMLElement;
}) {
  return (
    <SettingsProvider>
      <CoursesProvider>
        <PortalDomProvider overlayRoot={overlayRoot}>
          <CalendarOverlayUiProvider>{children}</CalendarOverlayUiProvider>
        </PortalDomProvider>
      </CoursesProvider>
    </SettingsProvider>
  );
}
