/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearCommunityUrlParams,
  hasCommunityUrlParams,
  readCommunityUrlParams,
  writeCommunityUrlParams,
} from './community-url-params';

describe('community-url-params', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/portal/TopPage.aspx');
  });

  afterEach(() => {
    history.replaceState(null, '', '/portal/TopPage.aspx');
  });

  it('detects community params in search string', () => {
    expect(hasCommunityUrlParams('?ca=1')).toBe(true);
    expect(hasCommunityUrlParams('?foo=bar')).toBe(false);
  });

  it('reads only community keys', () => {
    const params = readCommunityUrlParams('?ca=1&cp=home&noise=1');
    expect(params.get('ca')).toBe('1');
    expect(params.get('cp')).toBe('home');
    expect(params.has('noise')).toBe(false);
  });

  it('writes iframe search back to portal URL', () => {
    history.replaceState(null, '', '/portal/TopPage.aspx?foo=bar');
    writeCommunityUrlParams('ca=1&cp=explore');
    expect(location.search).toContain('ca=1');
    expect(location.search).toContain('cp=explore');
    expect(location.search).toContain('foo=bar');
  });

  it('clears community params from portal URL', () => {
    history.replaceState(null, '', '/portal/TopPage.aspx?ca=1&cp=home');
    clearCommunityUrlParams();
    expect(hasCommunityUrlParams()).toBe(false);
    expect(location.pathname).toContain('TopPage.aspx');
  });

  it('trims oversized param values', () => {
    const params = readCommunityUrlParams(`?cq=${'x'.repeat(80)}`);
    expect(params.get('cq')?.length).toBe(40);
  });
});
