import { describe, expect, it } from 'vitest';
import { groupCommentsByParent } from './comment-threads';
import type { CommunityComment } from '../types';

function comment(
  id: string,
  parentId: string | null,
  unavailable = false,
): CommunityComment {
  return {
    id,
    postId: 'post-1',
    parentId,
    replyToAuthorName: null,
    replyToAuthorLoginId: parentId ? 'parent-user' : null,
    authorName: unavailable ? '' : id,
    authorLoginId: unavailable ? '' : id,
    authorVerified: false,
    authorAvatarUrl: null,
    content: unavailable ? '' : id,
    status: 'approved',
    rejectionReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    unavailable,
  };
}

describe('groupCommentsByParent', () => {
  it('groups replies under their parent id', () => {
    const groups = groupCommentsByParent([
      comment('root', null),
      comment('reply', 'root'),
    ]);
    expect(groups.get(null)?.map((item) => item.id)).toEqual(['root']);
    expect(groups.get('root')?.map((item) => item.id)).toEqual(['reply']);
  });

  it('keeps unavailable parents so replies stay nested', () => {
    const groups = groupCommentsByParent([
      comment('gone', null, true),
      comment('reply', 'gone'),
    ]);
    expect(groups.get(null)?.[0]?.unavailable).toBe(true);
    expect(groups.get('gone')?.map((item) => item.id)).toEqual(['reply']);
  });
});
