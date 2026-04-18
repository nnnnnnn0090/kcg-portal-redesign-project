/**
 * 設定の React コンテキスト。
 * storage からの読み込みと、設定変更 → storage 書き込みを管理する。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { SK } from '../shared/constants';
import storage from '../lib/storage';
import { syncPortalTheme } from '../themes';

// ─── 型 ───────────────────────────────────────────────────────────────────

export interface Settings {
  theme:              string;
  kinoEmptyForce:     boolean;
  hoshuCalForce:      boolean;
  campusCalForce:     boolean;
  hideProfileName:    boolean;
  showKogiCalMascot:  boolean;
  home2WebMailOverlay: boolean;
}

export interface SettingsContextValue {
  settings:      Settings;
  /** ストレージからの初回読み込みが完了したら true になる */
  settingsReady: boolean;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  updateTheme:   (name: string) => void;
}

// ─── デフォルト値 ─────────────────────────────────────────────────────────

const DEFAULTS: Settings = {
  theme:             'dark',
  kinoEmptyForce:    false,
  hoshuCalForce:     false,
  campusCalForce:    false,
  hideProfileName:   false,
  showKogiCalMascot: false,
  home2WebMailOverlay: true,
};

// Settings キーから storage キーへの明示的マッピング。
// satisfies で網羅性を保証し、SK への unsafe なキャストを排除する。
const SETTINGS_TO_SK = {
  theme:           SK.theme,
  kinoEmptyForce:  SK.kinoEmptyForce,
  hoshuCalForce:   SK.hoshuCalForce,
  campusCalForce:  SK.campusCalForce,
  hideProfileName: SK.hideProfileName,
  showKogiCalMascot:  SK.showKogiCalMascot,
  home2WebMailOverlay: SK.home2WebMailOverlay,
} satisfies Record<keyof Settings, string>;

const STORAGE_KEYS = [
  SK.theme,
  SK.kinoEmptyForce,
  SK.hoshuCalForce,
  SK.campusCalForce,
  SK.hideProfileName,
  SK.showKogiCalMascot,
  SK.home2WebMailOverlay,
] as const;

function parseSettings(data: Record<string, unknown>): Settings {
  return {
    theme:           String(data[SK.theme]           ?? DEFAULTS.theme),
    kinoEmptyForce:  Boolean(data[SK.kinoEmptyForce]  ?? DEFAULTS.kinoEmptyForce),
    hoshuCalForce:   Boolean(data[SK.hoshuCalForce]   ?? DEFAULTS.hoshuCalForce),
    campusCalForce:  Boolean(data[SK.campusCalForce]  ?? DEFAULTS.campusCalForce),
    hideProfileName: Boolean(data[SK.hideProfileName] ?? DEFAULTS.hideProfileName),
    showKogiCalMascot: Boolean(data[SK.showKogiCalMascot] ?? DEFAULTS.showKogiCalMascot),
    home2WebMailOverlay: Boolean(data[SK.home2WebMailOverlay] ?? DEFAULTS.home2WebMailOverlay),
  };
}

// ─── コンテキスト ─────────────────────────────────────────────────────────

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings,      setSettings]      = useState<Settings>(DEFAULTS);
  const [settingsReady, setSettingsReady] = useState(false);

  useEffect(() => {
    void storage.get([...STORAGE_KEYS]).then((data) => {
      setSettings(parseSettings(data));
      setSettingsReady(true);
    });
  }, []);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    void storage.set({ [SETTINGS_TO_SK[key]]: value });
  }, []);

  const updateTheme = useCallback((name: string) => {
    updateSetting('theme', name);
    syncPortalTheme(name);
  }, [updateSetting]);

  const value = useMemo(
    () => ({ settings, settingsReady, updateSetting, updateTheme }),
    [settings, settingsReady, updateSetting, updateTheme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings は SettingsProvider の中で使ってください');
  return ctx;
}
