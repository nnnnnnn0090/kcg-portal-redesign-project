import { describe, expect, it } from 'vitest';
import { rebaseCommunityMediaUrl, resolveCommunityMediaUrls } from './api/mediaUrls';

const runtimeOrigin = 'https://community.example.com';

describe('rebaseCommunityMediaUrl', () => {
  it('rebases an absolute loopback API URL to the runtime API origin', () => {
    expect(
      rebaseCommunityMediaUrl(
        'http://127.0.0.1:8787/api/posts/post-1/images/0?size=large',
        runtimeOrigin,
      ),
    ).toBe('https://community.example.com/api/posts/post-1/images/0?size=large');
  });

  it('resolves a relative API URL against the runtime API origin', () => {
    expect(rebaseCommunityMediaUrl('/api/users/user-1/avatar', runtimeOrigin)).toBe(
      'https://community.example.com/api/users/user-1/avatar',
    );
  });

  it('does not rewrite external URLs', () => {
    expect(rebaseCommunityMediaUrl('https://images.example.net/avatar.png', runtimeOrigin)).toBe(
      'https://images.example.net/avatar.png',
    );
  });

  it('only rewrites known media fields in nested payloads', () => {
    const payload = {
      user: {
        avatarUrl: 'http://127.0.0.1:8787/api/users/user-1/avatar',
        websiteUrl: 'http://127.0.0.1:8787/api/external-profile',
      },
      notification: {
        post: {
          imageUrls: [
            'http://old-community.example/api/posts/post-1/images/0',
            '/api/posts/post-1/images/1',
          ],
        },
      },
    };

    expect(resolveCommunityMediaUrls(payload, runtimeOrigin)).toEqual({
      user: {
        avatarUrl: 'https://community.example.com/api/users/user-1/avatar',
        websiteUrl: 'http://127.0.0.1:8787/api/external-profile',
      },
      notification: {
        post: {
          imageUrls: [
            'https://community.example.com/api/posts/post-1/images/0',
            'https://community.example.com/api/posts/post-1/images/1',
          ],
        },
      },
    });
  });
});
