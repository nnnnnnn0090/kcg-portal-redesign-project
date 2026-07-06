const COMMUNITY_MEDIA_URL_KEYS = new Set([
  'avatarUrl',
  'headerUrl',
  'authorAvatarUrl',
  'imageUrl',
  'imageUrls',
]);

export function rebaseCommunityMediaUrl(value: string, origin: string): string {
  try {
    const url = new URL(value, origin);
    if (!url.pathname.startsWith('/api/')) return value;
    return new URL(`${url.pathname}${url.search}${url.hash}`, origin).toString();
  } catch {
    return value;
  }
}

export function resolveCommunityMediaUrls<T>(value: T, origin: string, key?: string): T {
  if (typeof value === 'string') {
    return (
      key && COMMUNITY_MEDIA_URL_KEYS.has(key) ? rebaseCommunityMediaUrl(value, origin) : value
    ) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveCommunityMediaUrls(item, origin, key)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([itemKey, item]) => [
        itemKey,
        resolveCommunityMediaUrls(item, origin, itemKey),
      ]),
    ) as T;
  }
  return value;
}
