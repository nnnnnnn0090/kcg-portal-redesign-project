/** King LMS の画面遷移 URL と SAML ログイン経由 URL を一元管理する。 */

import { KING_LMS_HOSTNAME, KING_LMS_ORIGIN } from '../contract/origins';
import {
  KING_LMS_ASSIGNMENT_SYNC_TARGET_URL,
  KING_LMS_ASSIGNMENT_SYNC_URL,
  KING_LMS_COURSE_SYNC_TARGET_URL,
  KING_LMS_COURSE_SYNC_URL,
  KING_LMS_HOME_URL,
  KING_LMS_SAML_APP_ID,
  KING_LMS_SAML_LOGIN_PATH,
} from '../contract/sync';

export {
  KING_LMS_ORIGIN,
  KING_LMS_HOSTNAME,
  KING_LMS_SAML_LOGIN_PATH,
  KING_LMS_SAML_APP_ID,
  KING_LMS_HOME_URL,
  KING_LMS_COURSE_SYNC_TARGET_URL,
  KING_LMS_ASSIGNMENT_SYNC_TARGET_URL,
  KING_LMS_COURSE_SYNC_URL,
  KING_LMS_ASSIGNMENT_SYNC_URL,
};

export function isKingLmsSamlLoginUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.origin === KING_LMS_ORIGIN && url.pathname === KING_LMS_SAML_LOGIN_PATH;
  } catch {
    return false;
  }
}

export function buildKingLmsSamlLoginUrl(destination: string): string {
  let rawDestination = destination;
  try {
    const existing = new URL(destination);
    if (isKingLmsSamlLoginUrl(existing.href)) {
      const nested = new URL(existing.searchParams.get('redirectUrl') ?? '');
      rawDestination =
        existing.searchParams.get('apId') === KING_LMS_SAML_APP_ID &&
        nested.origin === KING_LMS_ORIGIN
          ? nested.href
          : KING_LMS_HOME_URL;
    }
  } catch {
    // 不正な遷移先は下の King LMS ホームへフォールバックする。
  }

  let redirectUrl: string = KING_LMS_HOME_URL;
  try {
    const candidate = new URL(rawDestination);
    if (candidate.origin === KING_LMS_ORIGIN) redirectUrl = candidate.href;
  } catch {
    // noop
  }

  const loginUrl = new URL(KING_LMS_SAML_LOGIN_PATH, KING_LMS_ORIGIN);
  loginUrl.searchParams.set('apId', KING_LMS_SAML_APP_ID);
  loginUrl.searchParams.set('redirectUrl', redirectUrl);
  return loginUrl.href;
}
