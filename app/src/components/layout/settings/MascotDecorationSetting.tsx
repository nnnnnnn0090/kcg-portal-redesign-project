import { useId } from 'react';
import calendarMascotUrl from '../../../assets/mascot.png';
import homeCornerCharacterUrl from '../../../assets/914_20260621035718-display.webp';

type MascotArtwork = 'calendar' | 'homeCorner';

const illustratorName = import.meta.env.VITE_MASCOT_ILLUSTRATOR_NAME?.trim() ?? '';
const illustratorUrl = import.meta.env.VITE_MASCOT_ILLUSTRATOR_URL?.trim() ?? '';

interface MascotDecorationSettingProps {
  checked: boolean;
  label: string;
  artwork: MascotArtwork;
  onChange: (checked: boolean) => void;
}

export function MascotDecorationSetting({
  checked,
  label,
  artwork,
  onChange,
}: MascotDecorationSettingProps) {
  const inputId = useId();
  const imageUrl = artwork === 'calendar' ? calendarMascotUrl : homeCornerCharacterUrl;

  return (
    <div className={`p-mascot-setting p-mascot-setting--${artwork}`}>
      <div className="p-mascot-setting-preview" aria-hidden="true">
        <img src={imageUrl} alt="" />
      </div>
      <div className="p-mascot-setting-copy">
        <label htmlFor={inputId}>{label}</label>
        {illustratorName && illustratorUrl ? (
          <p>
            <span>Illustration by</span>{' '}
            <a href={illustratorUrl} target="_blank" rel="noopener noreferrer">
              {illustratorName}
            </a>
          </p>
        ) : null}
      </div>
      <label className="p-mascot-setting-switch" htmlFor={inputId}>
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span aria-hidden="true" />
      </label>
    </div>
  );
}
