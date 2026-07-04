import type { CommunityPost, CommunityUser, SocialLinks } from './types';
import { ALL_TAG, SOCIAL_PLATFORMS } from './constants';

export function websiteLabel(value: string): string {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return value;
  }
}

export function socialEntries(links: SocialLinks | null | undefined) {
  return SOCIAL_PLATFORMS.flatMap((platform) => {
    const url = links?.[platform.key];
    return url ? [{ ...platform, url }] : [];
  });
}

export function mergeOwnProfile(
  privateUser: CommunityUser,
  publicUser: CommunityUser,
): CommunityUser {
  return {
    ...publicUser,
    ...privateUser,
    websiteUrl: publicUser.websiteUrl ?? privateUser.websiteUrl,
    socialLinks: Object.keys(publicUser.socialLinks ?? {}).length
      ? publicUser.socialLinks
      : privateUser.socialLinks,
    followerCount: publicUser.followerCount,
    followingCount: publicUser.followingCount,
    followedByMe: publicUser.followedByMe,
  };
}

export function collectTags(posts: CommunityPost[], knownTags: string[], locale: string): string[] {
  const seen = new Set<string>();
  for (const post of posts) for (const tag of post.tags) if (tag) seen.add(tag);
  for (const tag of knownTags) if (tag) seen.add(tag);
  return [ALL_TAG, ...Array.from(seen).sort((a, b) => a.localeCompare(b, locale))];
}

export function filterPosts(posts: CommunityPost[], query: string, tag: string): CommunityPost[] {
  const needle = query.trim().toLocaleLowerCase();
  return posts.filter(
    (post) =>
      (tag === ALL_TAG || post.tags.includes(tag)) &&
      (!needle ||
        `${post.title} ${post.caption} ${post.authorName} ${post.authorLoginId} ${post.tags.join(' ')}`
          .toLocaleLowerCase()
          .includes(needle)),
  );
}
