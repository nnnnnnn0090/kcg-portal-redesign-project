import { describe, expect, it, vi } from 'vitest';
import * as origins from '../contract/origins';
import { parseCommunityAccessResponse } from './community-access';

describe('parseCommunityAccessResponse', () => {
  it('accepts allowlisted apiOrigin when enabled', () => {
    vi.spyOn(origins, 'isAllowedCommunityApiOrigin').mockReturnValue(true);
    expect(
      parseCommunityAccessResponse({
        enabled: true,
        apiOrigin: 'https://community.example.test/api',
      }),
    ).toEqual({
      enabled: true,
      apiOrigin: 'https://community.example.test',
    });
  });

  it('rejects apiOrigin outside the allowlist', () => {
    vi.spyOn(origins, 'isAllowedCommunityApiOrigin').mockReturnValue(false);
    expect(
      parseCommunityAccessResponse({
        enabled: true,
        apiOrigin: 'https://evil.example.test',
      }),
    ).toEqual({
      enabled: false,
      apiOrigin: '',
    });
  });
});
