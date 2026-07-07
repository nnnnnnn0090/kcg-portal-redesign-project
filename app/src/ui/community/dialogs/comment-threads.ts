import type { CommunityComment } from '../types';

export function groupCommentsByParent(
  comments: CommunityComment[],
): Map<string | null, CommunityComment[]> {
  const groups = new Map<string | null, CommunityComment[]>();
  for (const comment of comments) {
    const key = comment.parentId;
    const bucket = groups.get(key) ?? [];
    bucket.push(comment);
    groups.set(key, bucket);
  }
  return groups;
}
