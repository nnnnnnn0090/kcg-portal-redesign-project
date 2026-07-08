/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ALL_TAG } from '../constants';
import {
  clearCommunityUrlParams,
  communityUrlFromState,
  hasCommunityUrlParams,
  parseCommunityUrl,
  replaceCommunityUrl,
} from './community-url';

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

describe('community-url', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses explore page with query and tag', () => {
    const parsed = parseCommunityUrl('?ca=1&cp=explore&cq=campus&ct=campus');
    expect(parsed.open).toBe(true);
    expect(parsed.page).toBe('explore');
    expect(parsed.query).toBe('campus');
    expect(parsed.tag).toBe('campus');
    expect(parsed.modal.kind).toBe('none');
  });

  it('parses profile and post modal', () => {
    const parsed = parseCommunityUrl('?cp=profile&cu=seisei0809&cpost=abc-123');
    expect(parsed.page).toBe('profile');
    expect(parsed.userLoginId).toBe('seisei0809');
    expect(parsed.modal).toEqual({ kind: 'post', post: { id: 'abc-123' } });
  });

  it('round-trips state into search params', () => {
    const params = communityUrlFromState({
      page: 'following',
      query: '',
      tag: ALL_TAG,
      profileUser: null,
      modal: { kind: 'none' },
    });
    expect(params.get('ca')).toBe('1');
    expect(params.get('cp')).toBe('following');
    const parsed = parseCommunityUrl(`?${params.toString()}`);
    expect(parsed.page).toBe('following');
    expect(parsed.open).toBe(true);
  });

  it('detects community params', () => {
    expect(hasCommunityUrlParams('?cp=explore')).toBe(true);
    expect(hasCommunityUrlParams('?foo=bar')).toBe(false);
  });

  it('replaces and clears location search params', () => {
    const original = location.href;
    history.replaceState(null, '', '/portal/?foo=bar');
    replaceCommunityUrl({
      page: 'bookmarks',
      query: '',
      tag: ALL_TAG,
      profileUser: null,
      modal: { kind: 'none' },
    });
    expect(location.search).toContain('cp=bookmarks');
    expect(location.search).toContain('foo=bar');
    clearCommunityUrlParams();
    expect(location.search).toBe('?foo=bar');
    history.replaceState(null, '', original);
  });

  it('keeps /portal/ when syncing params from site root', () => {
    const replaceState = vi.spyOn(history, 'replaceState');
    stubPortalLocation('/', '?foo=bar');
    replaceCommunityUrl({
      page: 'explore',
      query: '',
      tag: ALL_TAG,
      profileUser: null,
      modal: { kind: 'none' },
    });
    expect(replaceState).toHaveBeenCalledWith(
      history.state,
      '',
      expect.stringMatching(/^\/portal\/\?.*cp=explore/),
    );
  });
});
