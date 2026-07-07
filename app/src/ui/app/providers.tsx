/**
 * アプリ全体のコンテキストプロバイダーをまとめるラッパー。
 */

import type { ReactNode } from 'react';
import { SettingsProvider } from '../../context/settings';
import { CoursesProvider }  from '../../context/courses';
import { CalendarOverlayUiProvider } from '../../context/calendarOverlayUi';
import { PortalDomProvider } from '../../context/portalDom';
import { I18nProvider } from '../../i18n';

export function AppProviders({
  children,
  overlayRoot,
}: {
  children: ReactNode;
  overlayRoot: HTMLElement;
}) {
  return (
    <SettingsProvider>
      <I18nProvider>
        <CoursesProvider>
          <PortalDomProvider overlayRoot={overlayRoot}>
            <CalendarOverlayUiProvider>{children}</CalendarOverlayUiProvider>
          </PortalDomProvider>
        </CoursesProvider>
      </I18nProvider>
    </SettingsProvider>
  );
}
