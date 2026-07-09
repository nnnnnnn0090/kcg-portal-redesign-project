/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { PORTAL_STUDENT_KEY_VALUE } from '../contract/portal-student-key';
import { hashPortalStudentKey } from '../lib/portal-student-key-hash';
import { portalFooterContainsStudentKey, readPortalStudentKeyProof } from './portal-student-key';

function setFooterHtml(html: string): void {
  document.body.innerHTML = `
    <footer>
      <div class="container">${html}</div>
    </footer>
  `;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('portal-student-key', () => {
  it('accepts the portal copyright footer line with any year range', async () => {
    setFooterHtml('<small>Copyright © 2015-2030 SystemD. All Rights Reserved.</small>');
    expect(portalFooterContainsStudentKey()).toBe(true);
    await expect(readPortalStudentKeyProof()).resolves.toBe(
      await hashPortalStudentKey(PORTAL_STUDENT_KEY_VALUE),
    );
  });

  it('accepts the SystemD marker alone', async () => {
    setFooterHtml(`<small>${PORTAL_STUDENT_KEY_VALUE}</small>`);
    const proof = await readPortalStudentKeyProof();
    expect(proof).toMatch(/^[0-9a-f]{64}$/);
    expect(proof).toBe(await hashPortalStudentKey(PORTAL_STUDENT_KEY_VALUE));
  });

  it('rejects pages without the portal footer marker', async () => {
    setFooterHtml('<small>Some other footer</small>');
    expect(portalFooterContainsStudentKey()).toBe(false);
    await expect(readPortalStudentKeyProof()).resolves.toBeNull();
  });

  it('ignores footer markup inside the extension overlay', async () => {
    document.body.innerHTML = `
      <div id="portal-overlay">
        <footer><div class="container"><small>${PORTAL_STUDENT_KEY_VALUE}</small></div></footer>
      </div>
    `;
    await expect(readPortalStudentKeyProof()).resolves.toBeNull();
  });
});
