import { describe, expect, it } from 'vitest';
import type { CommunityPost, CommunityUser } from './types';
import { collectTags, filterPosts, mergeOwnProfile, websiteLabel } from './utils';

const post = {
  id: '1',
  title: 'Game event',
  caption: 'Campus activity',
  authorName: 'Student',
  authorLoginId: 'student',
  tags: ['ゲーム'],
} as CommunityPost;

describe('community utilities', () => {
  it('collects unique sorted tags', () => {
    expect(collectTags([post], ['デザイン', 'ゲーム'], 'ja')).toEqual([
      '__all__',
      'ゲーム',
      'デザイン',
    ]);
  });

  it('filters posts by query and selected tag', () => {
    expect(filterPosts([post], 'student', 'ゲーム')).toEqual([post]);
    expect(filterPosts([post], 'missing', 'ゲーム')).toEqual([]);
  });

  it('keeps public relationship counts while merging an own profile', () => {
    const privateUser = {
      displayName: 'Private',
      websiteUrl: 'https://private.example',
      socialLinks: {},
    } as CommunityUser;
    const publicUser = {
      displayName: 'Public',
      websiteUrl: null,
      socialLinks: { github: 'https://github.com/user' },
      followerCount: 4,
      followingCount: 2,
      followedByMe: false,
    } as CommunityUser;
    const merged = mergeOwnProfile(privateUser, publicUser);
    expect(merged.displayName).toBe('Private');
    expect(merged.followerCount).toBe(4);
    expect(merged.socialLinks).toEqual(publicUser.socialLinks);
  });

  it('formats website labels and preserves invalid values', () => {
    expect(websiteLabel('https://example.com/path')).toBe('example.com/path');
    expect(websiteLabel('not a url')).toBe('not a url');
  });
});
