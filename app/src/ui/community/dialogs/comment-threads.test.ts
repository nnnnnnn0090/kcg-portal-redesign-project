import { describe, expect, it } from 'vitest';
import { groupCommentsByParent } from './comment-threads';
import type { CommunityComment } from '../types';

function comment(id: string, parentId: string | null): CommunityComment {
  return {
    id,
    postId: 'post-1',
    parentId,
    replyToAuthorName: null,
    replyToAuthorLoginId: parentId ? 'parent-user' : null,
    authorName: id,
    authorLoginId: id,
    authorVerified: false,
    authorAvatarUrl: null,
    content: id,
    status: 'approved',
    rejectionReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
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
});
