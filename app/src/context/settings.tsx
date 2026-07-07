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
import { syncPortalTheme } from '../domain/themes';
import {
  EMPTY_CUSTOM_THEMES,
  parseCustomThemeCollection,
  type CustomTheme,
  type StoredCustomThemeCollection,
} from '../domain/themes/custom-themes';
import type { CalendarWeekStart } from '../lib/date';
import { parseCalendarWeekStart } from '../lib/date';
import {
  DEFAULT_LANGUAGE,
  detectDefaultLanguage,
  normalizeLanguage,
  type AppLanguage,
} from '../i18n/messages';

// ─── 型 ───────────────────────────────────────────────────────────────────

export interface Settings {
  theme: string;
  hideProfileName: boolean;
  showKogiCalMascot: boolean;
  showHomeCornerCharacter: boolean;
  /** ホームの課題カレンダーを出さない */
  hideAssignmentCalendar: boolean;
  home2WebMailOverlay: boolean;
  cplanOverlay: boolean;
  /** カレンダーの列を「月〜日」または「日〜土」で始める */
  calendarWeekStart: CalendarWeekStart;
  /** 拡張 UI の表示言語 */
  language: AppLanguage;
}

export interface SettingsContextValue {
  settings: Settings;
  /** ストレージからの初回読み込みが完了したら true になる */
  settingsReady: boolean;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  updateTheme: (name: string) => void;
  customThemes: StoredCustomThemeCollection;
  saveCustomTheme: (theme: CustomTheme) => void;
  deleteCustomTheme: (id: string) => void;
}

// ─── デフォルト値 ─────────────────────────────────────────────────────────

const DEFAULTS: Settings = {
  theme: 'dark',
  hideProfileName: false,
  showKogiCalMascot: false,
  showHomeCornerCharacter: false,
  hideAssignmentCalendar: false,
  home2WebMailOverlay: true,
  cplanOverlay: true,
  calendarWeekStart: 'monday',
  language: DEFAULT_LANGUAGE,
};

// Settings キーから storage キーへの明示的マッピング。
// satisfies で網羅性を保証し、SK への unsafe なキャストを排除する。
const SETTINGS_TO_SK = {
  theme: SK.theme,
  hideProfileName: SK.hideProfileName,
  showKogiCalMascot: SK.showKogiCalMascot,
  showHomeCornerCharacter: SK.showHomeCornerCharacter,
  hideAssignmentCalendar: SK.hideAssignmentCalendar,
  home2WebMailOverlay: SK.home2WebMailOverlay,
  cplanOverlay: SK.cplanOverlay,
  calendarWeekStart: SK.calendarWeekStart,
  language: SK.language,
} satisfies Record<keyof Settings, string>;

const STORAGE_KEYS = [
  SK.theme,
  SK.hideProfileName,
  SK.showKogiCalMascot,
  SK.showHomeCornerCharacter,
  SK.hideAssignmentCalendar,
  SK.home2WebMailOverlay,
  SK.cplanOverlay,
  SK.calendarWeekStart,
  SK.language,
  SK.customThemes,
] as const;

function parseSettings(data: Record<string, unknown>): Settings {
  return {
    theme: String(data[SK.theme] ?? DEFAULTS.theme),
    hideProfileName: Boolean(data[SK.hideProfileName] ?? DEFAULTS.hideProfileName),
    showKogiCalMascot: Boolean(data[SK.showKogiCalMascot] ?? DEFAULTS.showKogiCalMascot),
    showHomeCornerCharacter: Boolean(
      data[SK.showHomeCornerCharacter] ?? DEFAULTS.showHomeCornerCharacter,
    ),
    hideAssignmentCalendar: Boolean(
      data[SK.hideAssignmentCalendar] ?? DEFAULTS.hideAssignmentCalendar,
    ),
    home2WebMailOverlay: Boolean(data[SK.home2WebMailOverlay] ?? DEFAULTS.home2WebMailOverlay),
    cplanOverlay: Boolean(data[SK.cplanOverlay] ?? DEFAULTS.cplanOverlay),
    calendarWeekStart: parseCalendarWeekStart(data[SK.calendarWeekStart]),
    language: normalizeLanguage(data[SK.language] ?? detectDefaultLanguage()),
  };
}

// ─── コンテキスト ─────────────────────────────────────────────────────────

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [customThemes, setCustomThemes] =
    useState<StoredCustomThemeCollection>(EMPTY_CUSTOM_THEMES);

  useEffect(() => {
    void storage.get([...STORAGE_KEYS]).then((data) => {
      const parsedThemes = parseCustomThemeCollection(data[SK.customThemes]);
      setCustomThemes(parsedThemes);
      setSettings(parseSettings(data));
      setSettingsReady(true);
    });
  }, []);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    void storage.set({ [SETTINGS_TO_SK[key]]: value });
  }, []);

  const updateTheme = useCallback(
    (name: string) => {
      updateSetting('theme', name);
      syncPortalTheme(name, customThemes);
    },
    [customThemes, updateSetting],
  );

  const saveCustomTheme = useCallback((theme: CustomTheme) => {
    setCustomThemes((previous) => {
      const themes = previous.themes.some((item) => item.id === theme.id)
        ? previous.themes.map((item) => (item.id === theme.id ? theme : item))
        : [...previous.themes, theme];
      const next = { schemaVersion: 1 as const, themes };
      void storage.set({ [SK.customThemes]: next });
      return next;
    });
  }, []);

  const deleteCustomTheme = useCallback((id: string) => {
    setCustomThemes((previous) => {
      const next = {
        schemaVersion: 1 as const,
        themes: previous.themes.filter((theme) => theme.id !== id),
      };
      void storage.set({ [SK.customThemes]: next });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      settingsReady,
      updateSetting,
      updateTheme,
      customThemes,
      saveCustomTheme,
      deleteCustomTheme,
    }),
    [
      settings,
      settingsReady,
      updateSetting,
      updateTheme,
      customThemes,
      saveCustomTheme,
      deleteCustomTheme,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings は SettingsProvider の中で使ってください');
  return ctx;
}
