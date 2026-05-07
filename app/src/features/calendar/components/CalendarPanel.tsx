/**
 * 授業・補修・キャンパスなど、ポータル公式カレンダー API を表示する汎用パネルです。
 * `useCalendarPanel` が `postMessage` とフェッチを束ね、`CalendarShell` がツールバーとグリッド領域を描画します。
 */

import kogiWeekSleepMascotUrl from '../../../assets/mascot.png';
import { useSettings } from '../../../context/settings';
import { useCalendarPanel, type CalendarPanelConfig } from '../use-panel';
import { CalendarShell } from './CalendarShell';

export function CalendarPanel(props: CalendarPanelConfig) {
  const { settings } = useSettings();
  const {
    calBodyRef,
    panelVisible,
    viewMode,
    calKind,
    modeTitle,
    modeGroupLabel,
    title,
    switchMode,
    navigate,
    toolbarLocked,
  } = useCalendarPanel(props);

  const showSleepMascot = Boolean(props.sleepMascotSlot && settings.showKogiCalMascot);

  return (
    <div
      className="p-panel-cal-wrap"
      hidden={!panelVisible}
    >
      <section
        className={`p-panel p-panel-cal${viewMode === 'month' ? ' is-month' : ''}`}
        data-cal-kind={calKind || undefined}
      >
        <CalendarShell
          viewMode={viewMode}
          modeTitle={modeTitle}
          modeGroupLabel={modeGroupLabel}
          rangeLabel={title}
          switchMode={switchMode}
          navigate={navigate}
          calBodyRef={calBodyRef}
          navDisabled={toolbarLocked}
          controlsDisabled={toolbarLocked}
        />
      </section>
      {showSleepMascot ? (
        <img
          className="p-cal-kogi-sleep-mascot"
          src={kogiWeekSleepMascotUrl}
          alt=""
          decoding="async"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
