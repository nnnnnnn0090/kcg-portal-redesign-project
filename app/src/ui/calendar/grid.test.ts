import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildCalendarGridHtml } from './grid';
import type { ViewMeta } from './types';
import { KING_LMS_ORIGIN, KING_LMS_SAML_LOGIN_PATH } from '../../shared/king-lms-url';

const baseMeta: ViewMeta = {
  mode: 'week',
  monthRef: null,
  kingLmsCourses: [],
  calKind: 'assignment',
  weekStart: 'monday',
  language: 'ja',
  todayIso: '2026-07-02',
};

beforeAll(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      let text = '';
      return {
        set textContent(value: string) {
          text = value;
        },
        get innerHTML() {
          return text
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;');
        },
      };
    },
  });
});

afterAll(() => vi.unstubAllGlobals());

describe('buildCalendarGridHtml King LMS links', () => {
  it('課題リンクをSAMLログインURLで包む', () => {
    const destination = `${KING_LMS_ORIGIN}/ultra/courses/course-id/outline`;
    const html = buildCalendarGridHtml(
      [{ start: '2026-07-02T12:00:00', title: '課題', href: destination }],
      { start: '2026-06-29', end: '2026-07-06' },
      baseMeta,
    );

    expect(html).toContain(KING_LMS_SAML_LOGIN_PATH);
    expect(html).toContain(encodeURIComponent(destination).replaceAll('%20', '+'));
    expect(html).not.toContain(`href="${destination}"`);
  });

  it('授業コースの保存済みURLをSAMLログインURLで包む', () => {
    const destination = `${KING_LMS_ORIGIN}/ultra/courses/course-id/outline`;
    const html = buildCalendarGridHtml(
      [{ start: '2026-07-02', title: '1 Web Programming' }],
      { start: '2026-06-29', end: '2026-07-06' },
      {
        ...baseMeta,
        calKind: 'kogi',
        kingLmsCourses: [{ displayName: 'Mon1 Web Programming', externalAccessUrl: destination }],
      },
    );

    expect(html).toContain(KING_LMS_SAML_LOGIN_PATH);
    expect(html).not.toContain(`href="${destination}"`);
  });
});
