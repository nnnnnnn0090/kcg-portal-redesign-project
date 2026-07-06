import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLIENT_USER_ID_HEADER } from '../../../shared/constants';
import { communityApi } from '../api';
import { setCommunityApiOrigin, setCommunityRequestLoginId } from './runtime';

vi.mock('../../../lib/client-user-id', () => ({
  getOrCreateClientUserId: vi.fn().mockResolvedValue('client-uuid'),
}));

describe('community HTTP client', () => {
  beforeEach(() => {
    setCommunityApiOrigin('https://community.example.com');
    setCommunityRequestLoginId('student');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setCommunityApiOrigin('');
    setCommunityRequestLoginId(null);
  });

  it('uses the runtime origin for requests and response media', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            posts: [
              {
                id: 'post-1',
                imageUrl: 'http://127.0.0.1:8787/api/posts/post-1/images/0',
                imageUrls: ['/api/posts/post-1/images/0'],
                authorAvatarUrl: 'http://old-host.example/api/users/student/images/avatar',
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await communityApi.posts();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://community.example.com/api/posts');
    expect(new Headers(init.headers).get(CLIENT_USER_ID_HEADER)).toBe('client-uuid');
    expect(new Headers(init.headers).get('X-KCG-Community-Login-Id')).toBe('student');
    expect(result.posts[0].imageUrl).toBe(
      'https://community.example.com/api/posts/post-1/images/0',
    );
    expect(result.posts[0].imageUrls).toEqual([
      'https://community.example.com/api/posts/post-1/images/0',
    ]);
    expect(result.posts[0].authorAvatarUrl).toBe(
      'https://community.example.com/api/users/student/images/avatar',
    );
  });
});
