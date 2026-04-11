/**
 * King LMS ブリッジ用 URL 判定とリダイレクト先組み立て。
 */

import { KING_LMS_HOSTNAME } from '../../shared/constants';

export function isLoginRedirectPage(): boolean {
  try {
    if (location.hostname !== KING_LMS_HOSTNAME) return false;
    const path = location.pathname ?? '';
    if (path !== '/' && path !== '') return false;
    return new URLSearchParams(location.search).has('new_loc');
  } catch { return false; }
}

export function isCoursePage(): boolean {
  try { return location.hostname === KING_LMS_HOSTNAME && /\/ultra\/course/.test(location.pathname); }
  catch { return false; }
}

export function isStreamPage(): boolean {
  try { return location.hostname === KING_LMS_HOSTNAME && /\/ultra\/stream/.test(location.pathname); }
  catch { return false; }
}

export function buildRedirectUrl(base: string, hash: string): string {
  try {
    const u = new URL(base);
    u.hash = hash;
    return u.href;
  } catch {
    return base.split('#')[0] + '#' + hash;
  }
}
