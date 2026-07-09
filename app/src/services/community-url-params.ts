/**
 * ポータルURL上のコミュニティ用パラメータ（ディープリンク）の親フレーム側ヘルパー。
 */

import {
  COMMUNITY_URL_PARAM_KEYS,
  COMMUNITY_URL_PARAM_KEY_SET,
  trimCommunityUrlValue,
} from '@community-boundary/url-params';
import { sanitizePortalLocationUrl } from '../domain/portal/portal-location-url';

export { COMMUNITY_URL_PARAM_KEYS as COMMUNITY_URL_KEYS };

export function hasCommunityUrlParams(search = location.search): boolean {
  const params = new URLSearchParams(search);
  for (const key of COMMUNITY_URL_PARAM_KEY_SET) {
    if (params.has(key)) return true;
  }
  return false;
}

export function readCommunityUrlParams(search = location.search): URLSearchParams {
  const params = new URLSearchParams(search);
  const out = new URLSearchParams();
  for (const key of COMMUNITY_URL_PARAM_KEYS) {
    const value = params.get(key);
    if (value != null) out.set(key, trimCommunityUrlValue(key, value));
  }
  return out;
}

function currentHrefWithoutCommunityParams(): URL {
  const url = new URL(location.href);
  for (const key of COMMUNITY_URL_PARAM_KEY_SET) url.searchParams.delete(key);
  sanitizePortalLocationUrl(url);
  return url;
}

export function writeCommunityUrlParams(search: string): void {
  const incoming = new URLSearchParams(search);
  const url = currentHrefWithoutCommunityParams();
  for (const key of COMMUNITY_URL_PARAM_KEYS) {
    const value = incoming.get(key);
    if (value != null) url.searchParams.set(key, trimCommunityUrlValue(key, value));
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next === `${location.pathname}${location.search}${location.hash}`) return;
  history.replaceState(history.state, '', next);
}

export function clearCommunityUrlParams(): void {
  if (!hasCommunityUrlParams()) return;
  const url = currentHrefWithoutCommunityParams();
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
