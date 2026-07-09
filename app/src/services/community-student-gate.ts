import { PORTAL_STUDENT_GATE_HEADER } from '../contract/portal-student-key';
import { COMMUNITY_BOUNDARY_TIMING } from '@community-boundary/timing';

export type CommunityGateFailure = 'network' | 'forbidden' | 'timeout';

/** pv ヘッダーでゲート Cookie を取得してから iframe を開く */
export async function establishCommunityStudentGate(
  origin: string,
  proof: string,
): Promise<{ ok: true } | { ok: false; reason: CommunityGateFailure }> {
  try {
    const response = await fetch(`${origin}/api/gate`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
      headers: {
        [PORTAL_STUDENT_GATE_HEADER]: proof,
      },
      signal: AbortSignal.timeout(COMMUNITY_BOUNDARY_TIMING.gateTimeoutMs),
    });
    if (response.status === 204) return { ok: true };
    if (response.status === 403) return { ok: false, reason: 'forbidden' };
    return { ok: false, reason: 'network' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return { ok: false, reason: 'timeout' };
    }
    return { ok: false, reason: 'network' };
  }
}
