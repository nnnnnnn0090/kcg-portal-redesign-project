/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildPortalHistoryUrl,
  canonicalPortalHref,
  canonicalPortalPathname,
  ensureCanonicalPortalUrl,
  isPortalHomePathname,
  normalizePortalPathname,
  sanitizePortalLocationUrl,
} from './portal-location-url';
import { matchPortalRoute } from './router';

function stubPortalLocation(pathname: string, search = ''): void {
  const href = `https://home.kcg.ac.jp${pathname}${search}`;
  vi.stubGlobal('location', {
    ...window.location,
    href,
    origin: 'https://home.kcg.ac.jp',
    protocol: 'https:',
    host: 'home.kcg.ac.jp',
    hostname: 'home.kcg.ac.jp',
    pathname,
    search,
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  });
}

describe('portal-location-url', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes trailing slashes for routing', () => {
    expect(normalizePortalPathname('/portal/')).toBe('/portal');
    expect(normalizePortalPathname('/')).toBe('/portal');
    expect(normalizePortalPathname('/portal/News/')).toBe('/portal/News');
  });

  it('canonicalizes portal home paths to /portal/', () => {
    expect(canonicalPortalPathname('/')).toBe('/portal/');
    expect(canonicalPortalPathname('/portal')).toBe('/portal/');
    expect(canonicalPortalPathname('/portal/')).toBe('/portal/');
    expect(canonicalPortalPathname('/portal/News')).toBe('/portal/News');
  });

  it('detects portal home pathnames', () => {
    expect(isPortalHomePathname('/')).toBe(true);
    expect(isPortalHomePathname('/portal')).toBe(true);
    expect(isPortalHomePathname('/portal/')).toBe(true);
    expect(isPortalHomePathname('/portal/News')).toBe(false);
  });

  it('sanitizes legacy contact form query params', () => {
    const url = new URL('https://home.kcg.ac.jp/?category=community&subject=s&message=s');
    sanitizePortalLocationUrl(url);
    expect(url.pathname).toBe('/portal/');
    expect(url.search).toBe('');
  });

  it('matches portal home from site root', () => {
    stubPortalLocation('/');
    expect(matchPortalRoute()).toEqual({ page: 'home' });
  });

  it('canonicalizes portal hrefs', () => {
    stubPortalLocation('/', '?foo=1');
    expect(canonicalPortalHref(location.href)).toBe('https://home.kcg.ac.jp/portal/?foo=1');
    expect(canonicalPortalHref('https://home.kcg.ac.jp/portal/News')).toBe(
      'https://home.kcg.ac.jp/portal/News',
    );
    expect(canonicalPortalHref('https://king-lms.kcg.edu/')).toBe('https://king-lms.kcg.edu/');
  });

  it('builds sanitized history urls', () => {
    stubPortalLocation('/', '?category=community&subject=s&message=s');
    expect(buildPortalHistoryUrl()).toBe('/portal/');
  });

  it('rewrites site root to /portal/ in the address bar', () => {
    const replaceState = vi.spyOn(history, 'replaceState');
    stubPortalLocation('/', '?foo=bar');
    ensureCanonicalPortalUrl();
    expect(replaceState).toHaveBeenCalledWith(history.state, '', '/portal/?foo=bar');
  });
});
