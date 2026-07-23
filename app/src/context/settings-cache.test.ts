/** @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { SK } from '../contract/storage-keys';
import { createCustomTheme, customThemeRef, THEMES } from '../domain/themes';
import { installChromeStorageMock } from '../platform/storage/chrome-storage-client.test-support';
import { SettingsProvider, useSettings } from './settings';

let stored: Record<string, unknown>;

describe('SettingsProvider local cache', () => {
  beforeEach(() => {
    stored = {};
    installChromeStorageMock(stored);
    document.head.replaceChildren();
    document.body.replaceChildren();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  it('first renders children with the cached theme, language, and custom theme', async () => {
    const customTheme = createCustomTheme('Cached', 'dark', THEMES.dark);
    const themeRef = customThemeRef(customTheme.id);
    stored[SK.theme] = themeRef;
    stored[SK.language] = 'en';
    stored[SK.customThemes] = { schemaVersion: 1, themes: [customTheme] };
    const observed: string[] = [];

    function Probe() {
      const { settings, customThemes } = useSettings();
      observed.push(`${settings.theme}:${settings.language}:${customThemes.themes[0]?.name}`);
      return createElement('output', { id: 'settings-cache-probe' });
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(SettingsProvider, null, createElement(Probe)));
    });

    expect(document.getElementById('settings-cache-probe')).not.toBeNull();
    expect(observed).toEqual([`${themeRef}:en:Cached`]);

    await act(async () => root.unmount());
  });
});
