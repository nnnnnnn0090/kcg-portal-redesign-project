interface SettingsSwitchProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

export function SettingsSwitch({ checked, label, onChange }: SettingsSwitchProps) {
  return (
    <label className="p-settings-switch-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="p-settings-switch-track" aria-hidden="true" />
    </label>
  );
}
