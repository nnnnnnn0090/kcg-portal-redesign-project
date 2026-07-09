/**
 * ポータル DOM 上のフッター文言で「生徒ポータルにいる」ことを確認する。
 * 認証情報（Cookie / X-CPAuthorize 等）は読み取らない。
 */

import { PORTAL_STUDENT_KEY_VALUE } from '../contract/portal-student-key';
import { hashPortalStudentKey } from '../lib/portal-student-key-hash';
import { PORTAL_DOM } from '../shared/constants';

const FOOTER_SELECTORS = [
  'body > footer .container small',
  'footer .container small',
  'footer small',
  '.footer small',
] as const;

function normalizeFooterText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function hostFooterSmallElements(): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const selector of FOOTER_SELECTORS) {
    for (const node of document.querySelectorAll(selector)) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.closest(`#${PORTAL_DOM.overlayRoot}`)) continue;
      out.push(node);
    }
  }
  return out;
}

/** ポータルフッターに生徒ゲート用の文言があるか */
export function portalFooterContainsStudentKey(): boolean {
  for (const el of hostFooterSmallElements()) {
    const text = normalizeFooterText(el.textContent ?? '');
    if (text.includes(PORTAL_STUDENT_KEY_VALUE)) return true;
  }
  return false;
}

/** iframe へ渡すゲート証明（SHA-256 ハッシュ）。フッター未確認時は null */
export async function readPortalStudentKeyProof(): Promise<string | null> {
  if (!portalFooterContainsStudentKey()) return null;
  return hashPortalStudentKey(PORTAL_STUDENT_KEY_VALUE);
}
