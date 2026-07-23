/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest';
import { PORTAL_DOM, RUNTIME_CSS_FALLBACK_ID } from '../contract/dom';
import { SK } from '../contract/storage-keys';
import { createCustomTheme, customThemeRef, THEMES } from '../domain/themes';
import { installChromeStorageMock } from '../platform/storage/chrome-storage-client.test-support';
import { mountHome2MailOverlay } from '../entrypoints/home2.content/mount-home2-mail-overlay';
import { applyHome2EarlyBootCover } from './home2-host';

let stored: Record<string, unknown>;

describe('Home2 early boot cache', () => {
  beforeEach(() => {
    stored = {};
    installChromeStorageMock(stored);
    document.head.replaceChildren();
    document.body.replaceChildren();
    document.documentElement.className = '';
    document.body.className = '';
  });

  it('does not inject a boot cover when the cached overlay setting is false', async () => {
    stored[SK.home2WebMailOverlay] = false;
    stored[SK.theme] = 'green';

    await applyHome2EarlyBootCover();

    expect(document.getElementById(PORTAL_DOM.bootCover)).toBeNull();
  });

  it('does not inject host CSS or a React overlay when the cached setting is false', async () => {
    stored[SK.home2WebMailOverlay] = false;

    await mountHome2MailOverlay({ kind: 'home2-mail', layout: 'full' });

    expect(document.getElementById(PORTAL_DOM.overlayRoot)).toBeNull();
    expect(document.getElementById(PORTAL_DOM.home2HostTweak)).toBeNull();
    expect(document.getElementById(RUNTIME_CSS_FALLBACK_ID)).toBeNull();
    expect(document.documentElement.classList.contains('kcg-portal-surface')).toBe(false);
  });

  it('applies a cached custom theme to the early boot cover', async () => {
    const customTheme = createCustomTheme('Cached', 'dark', THEMES.dark);
    customTheme.tokens.bg = '#123456';
    stored[SK.home2WebMailOverlay] = true;
    stored[SK.theme] = customThemeRef(customTheme.id);
    stored[SK.customThemes] = { schemaVersion: 1, themes: [customTheme] };

    await applyHome2EarlyBootCover();

    expect(document.getElementById(PORTAL_DOM.bootCover)).not.toBeNull();
    expect(document.getElementById(RUNTIME_CSS_FALLBACK_ID)?.textContent).toContain('#123456');
  });
});
