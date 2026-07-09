import { portalStudentKeyHashMaterial } from '../contract/portal-student-key';

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** 平文のフッター文言を HTTP ヘッダーに載せないための pv 値 */
export async function hashPortalStudentKey(key: string): Promise<string> {
  return sha256Hex(portalStudentKeyHashMaterial(key));
}
