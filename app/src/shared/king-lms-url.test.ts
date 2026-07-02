import { describe, expect, it } from 'vitest';
import {
  buildKingLmsSamlLoginUrl,
  isKingLmsSamlLoginUrl,
  KING_LMS_HOME_URL,
  KING_LMS_ORIGIN,
  KING_LMS_SAML_APP_ID,
  KING_LMS_SAML_LOGIN_PATH,
} from './king-lms-url';

function parseLoginUrl(destination: string): URL {
  return new URL(buildKingLmsSamlLoginUrl(destination));
}

describe('buildKingLmsSamlLoginUrl', () => {
  it('King LMS 内の目的地とクエリ・ハッシュを維持する', () => {
    const destination = `${KING_LMS_ORIGIN}/ultra/courses/course-id/outline?view=full#content`;
    const loginUrl = parseLoginUrl(destination);

    expect(loginUrl.pathname).toBe(KING_LMS_SAML_LOGIN_PATH);
    expect(loginUrl.searchParams.get('apId')).toBe(KING_LMS_SAML_APP_ID);
    expect(loginUrl.searchParams.get('redirectUrl')).toBe(destination);
  });

  it.each(['not a url', 'https://example.com/ultra/course'])(
    '不正または外部の目的地 %s は King LMS ホームへフォールバックする',
    (destination) => {
      expect(parseLoginUrl(destination).searchParams.get('redirectUrl')).toBe(KING_LMS_HOME_URL);
    },
  );

  it('有効なSAML URLを重ねて包まない', () => {
    const destination = `${KING_LMS_ORIGIN}/ultra/calendar`;
    const first = buildKingLmsSamlLoginUrl(destination);
    expect(buildKingLmsSamlLoginUrl(first)).toBe(first);
  });
});

describe('isKingLmsSamlLoginUrl', () => {
  it('King LMS のSAMLログインページだけを判定する', () => {
    expect(isKingLmsSamlLoginUrl(buildKingLmsSamlLoginUrl(KING_LMS_HOME_URL))).toBe(true);
    expect(isKingLmsSamlLoginUrl(`${KING_LMS_ORIGIN}/ultra`)).toBe(false);
    expect(isKingLmsSamlLoginUrl('https://example.com/auth-saml/saml/login')).toBe(false);
  });
});
