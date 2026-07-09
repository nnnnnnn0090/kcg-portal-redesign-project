/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PORTAL_STUDENT_GATE_HEADER } from '../contract/portal-student-key';
import { establishCommunityStudentGate } from './community-student-gate';

describe('establishCommunityStudentGate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends pv in header and succeeds on 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await establishCommunityStudentGate('https://portal-community.com', 'abc123');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('https://portal-community.com/api/gate', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
      headers: { [PORTAL_STUDENT_GATE_HEADER]: 'abc123' },
      signal: expect.any(AbortSignal),
    });
  });

  it('returns forbidden when gate rejects proof', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    const result = await establishCommunityStudentGate('https://portal-community.com', 'bad');
    expect(result).toEqual({ ok: false, reason: 'forbidden' });
  });
});
