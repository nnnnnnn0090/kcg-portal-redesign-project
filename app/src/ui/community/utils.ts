import type { CommunityPost, CommunityUser, SocialLinks } from './types';
import { ALL_TAG, SOCIAL_PLATFORMS } from './constants';

export function formatCommunityDateTime(
  value: string | number | Date,
  ja: boolean,
  style: 'compact' | 'full' = 'full',
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = ja ? 'ja-JP' : 'en-US';
  if (style === 'compact') {
    return date.toLocaleString(locale, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCommunityCount(count: number, ja: boolean): string {
  const formatted = count.toLocaleString(ja ? 'ja-JP' : 'en-US');
  return ja ? `${formatted}件` : formatted;
}

export function formatCommunityMetric(
  count: number,
  ja: boolean,
  metric: { ja: string; enSingular: string; enPlural: string },
): string {
  const formatted = count.toLocaleString(ja ? 'ja-JP' : 'en-US');
  if (ja) return `${metric.ja} ${formatted}件`;
  const unit = count === 1 ? metric.enSingular : metric.enPlural;
  return `${formatted} ${unit}`;
}

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
