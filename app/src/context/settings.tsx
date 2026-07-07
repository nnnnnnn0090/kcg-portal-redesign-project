/**
 * 設定の React コンテキスト。
 * 拡張状態はポータル「マイリンク」に同期し、セッション内メモリのみ保持する。
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
  type CustomTheme,
  type StoredCustomThemeCollection,
} from '../domain/themes/custom-themes';
import type { CalendarWeekStart } from '../lib/date';
import {
  DEFAULT_LANGUAGE,
  type AppLanguage,
} from '../i18n/messages';
import { getOrCreateClientUserId } from '../lib/client-user-id';
import { getPortalExtensionMemorySnapshot } from '../platform/storage/portal-extension-store';
import {
  bootstrapPortalExtensionSync,
  parseCustomThemesFromExtensionStorage,
  parseSettingsFromExtensionStorage,
  schedulePortalExtensionSync,
} from '../services/portal-settings-sync';

// ─── 型 ───────────────────────────────────────────────────────────────────

export interface Settings {
  theme: string;
  hideProfileName: boolean;
  showKogiCalMascot: boolean;
  showHomeCornerCharacter: boolean;
  hideAssignmentCalendar: boolean;
  home2WebMailOverlay: boolean;
  cplanOverlay: boolean;
  calendarWeekStart: CalendarWeekStart;
  language: AppLanguage;
}

export interface SettingsContextValue {
  settings: Settings;
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

function parseSettings(data: Record<string, unknown>): Settings {
  return parseSettingsFromExtensionStorage(data);
}

function loadUiStateFromStorage(data: Record<string, unknown>): {
  settings: Settings;
  customThemes: StoredCustomThemeCollection;
} {
  return {
    settings: parseSettings(data),
    customThemes: parseCustomThemesFromExtensionStorage(data),
  };
}

// ─── コンテキスト ─────────────────────────────────────────────────────────

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [customThemes, setCustomThemes] =
    useState<StoredCustomThemeCollection>(EMPTY_CUSTOM_THEMES);
  const customThemesRef = useMemo(() => ({ current: customThemes }), [customThemes]);
  customThemesRef.current = customThemes;

  const applyStorageToUi = useCallback((data: Record<string, unknown>) => {
    const next = loadUiStateFromStorage(data);
    setSettings(next.settings);
    setCustomThemes(next.customThemes);
    syncPortalTheme(next.settings.theme, next.customThemes);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await bootstrapPortalExtensionSync();
      if (cancelled) return;

      await getOrCreateClientUserId();
      if (!cancelled) applyStorageToUi(getPortalExtensionMemorySnapshot().storage);

      if (!cancelled) setSettingsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyStorageToUi]);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      void storage.set({ [SETTINGS_TO_SK[key]]: value });
      schedulePortalExtensionSync();
      return next;
    });
  }, []);

  const updateTheme = useCallback(
    (name: string) => {
      updateSetting('theme', name);
      syncPortalTheme(name, customThemesRef.current);
    },
    [updateSetting, customThemesRef],
  );

  const saveCustomTheme = useCallback((theme: CustomTheme) => {
    setCustomThemes((previous) => {
      const themes = previous.themes.some((item) => item.id === theme.id)
        ? previous.themes.map((item) => (item.id === theme.id ? theme : item))
        : [...previous.themes, theme];
      const next = { schemaVersion: 1 as const, themes };
      void storage.set({ [SK.customThemes]: next });
      schedulePortalExtensionSync();
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
      schedulePortalExtensionSync();
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
