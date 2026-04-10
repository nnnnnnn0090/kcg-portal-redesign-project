/**
 * ポータルカレンダーパネル。
 * useCalendarPanel フックでデータ取得・描画ロジックを管理し、
 * CalendarShell で UI を描画する。
 * 授業/補修/キャンパスの 3 種類に使い回す汎用コンポーネント。
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
