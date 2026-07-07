import { describe, expect, it } from 'vitest';
import { buildLinkEditorRows, LINK_EDITOR_EXTRAS } from './link-editor-rows';

describe('buildLinkEditorRows', () => {
  it('includes official links from UserHtmlLink and fixed extras', () => {
    const rows = buildLinkEditorRows(
      [
        { midashi: 'KING-LMS', url: 'https://lms.example/', kubun: 0 },
        { midashi: 'My Site', url: 'https://mine.example/', kubun: 1 },
      ],
      LINK_EDITOR_EXTRAS,
      [],
    );
    expect(rows.some((r) => r.midashi === 'KING-LMS')).toBe(true);
    expect(rows.some((r) => r.midashi === 'My Site' && r.isCustom)).toBe(true);
    expect(rows.some((r) => r.midashi === '学生出欠登録')).toBe(true);
  });

  it('shows user links from Me when home list omits kubun=1', () => {
    const rows = buildLinkEditorRows(
      [{ midashi: 'Official', url: 'https://official.example/', kubun: 0 }],
      LINK_EDITOR_EXTRAS,
      [
        {
          id: 'u1',
          version: 1,
          linkNo: 1,
          midashi: 'Custom',
          url: 'https://custom.example/',
          biko: '',
          order: 0,
          delFlg: false,
        },
      ],
    );
    expect(rows.some((r) => r.midashi === 'Custom' && r.portalId === 'u1')).toBe(true);
  });

  it('does not duplicate user links present in both home and Me', () => {
    const rows = buildLinkEditorRows(
      [{ midashi: 'Custom', url: 'https://custom.example/', kubun: 1 }],
      LINK_EDITOR_EXTRAS,
      [
        {
          id: 'u1',
          version: 1,
          linkNo: 1,
          midashi: 'Custom',
          url: 'https://custom.example/',
          biko: '',
          order: 0,
          delFlg: false,
        },
      ],
    );
    expect(rows.filter((r) => r.midashi === 'Custom')).toHaveLength(1);
  });

  it('hides portal settings marker links from shortcuts', () => {
    const rows = buildLinkEditorRows(
      [
        {
          midashi: '__KCGLMS::0',
          url: 'https://home.kcg.ac.jp/portal/_kcglms/0',
          kubun: 1,
        },
      ],
      LINK_EDITOR_EXTRAS,
      [
        {
          id: 'cfg',
          version: 1,
          linkNo: 99,
          midashi: '__KCGLMS::0',
          url: 'https://home.kcg.ac.jp/portal/_kcglms/0',
          biko: '{"v":1}',
          order: 0,
          delFlg: false,
        },
      ],
    );
    expect(rows.some((r) => r.midashi.startsWith('__KCGLMS::'))).toBe(false);
  });
});
