import { CollectionRefTypes } from '@mx-space/api-client'
import { describe, expect, it } from 'vitest'

import {
  buildCommentTreeItem,
  type CommentThreadInfiniteData,
  type CommentThreadRecord,
  type CommentWithAnchor,
  mergeThreadRepliesIntoPages,
} from './thread'

const makeComment = (
  id: string,
  createdAt: string,
  overrides: Partial<CommentWithAnchor> = {},
): CommentWithAnchor => ({
  agent: null,
  anchor: null,
  authProvider: null,
  author: `author-${id}`,
  avatar: null,
  createdAt,
  deletedAt: null,
  editedAt: null,
  id,
  ip: null,
  isDeleted: false,
  isWhispers: false,
  latestReplyAt: null,
  location: null,
  parentCommentId: null,
  pin: false,
  readerId: null,
  refId: 'post-id',
  refType: CollectionRefTypes.Post,
  replyCount: 0,
  rootCommentId: null,
  state: 1,
  text: `text-${id}`,
  url: null,
  ...overrides,
})

const makeThread = (
  replies: CommentWithAnchor[],
  overrides: Partial<CommentThreadRecord> = {},
): CommentThreadRecord => ({
  ...makeComment('root', '2026-03-14T10:00:00.000Z'),
  replies,
  replyWindow: {
    hasHidden: false,
    hiddenCount: 0,
    returned: replies.length,
    threshold: 20,
    total: replies.length,
  },
  ...overrides,
})

describe('comment thread helpers', () => {
  it('rebuilds nested children from flat replies using parentCommentId', () => {
    const root = makeThread([
      makeComment('child-2', '2026-03-14T10:03:00.000Z', {
        parentCommentId: 'child-1',
        rootCommentId: 'root',
      }),
      makeComment('child-1', '2026-03-14T10:01:00.000Z', {
        parentCommentId: 'root',
        rootCommentId: 'root',
      }),
      makeComment('orphan', '2026-03-14T10:02:00.000Z', {
        parentCommentId: 'missing-parent',
        rootCommentId: 'root',
      }),
    ])

    const tree = buildCommentTreeItem(root)

    expect(tree.children.map((comment) => comment.id)).toEqual([
      'child-1',
      'orphan',
    ])
    expect(tree.children[0]?.children.map((comment) => comment.id)).toEqual([
      'child-2',
    ])
  })

  it('merges cursor-loaded replies back into thread pages', () => {
    const root = makeThread(
      [
        makeComment('child-1', '2026-03-14T10:01:00.000Z'),
        makeComment('child-3', '2026-03-14T10:03:00.000Z'),
      ],
      {
        replyWindow: {
          hasHidden: true,
          hiddenCount: 1,
          nextCursor: 'cursor-1',
          returned: 2,
          threshold: 20,
          total: 3,
        },
      },
    )
    const data: CommentThreadInfiniteData = {
      pageParams: [1],
      pages: [
        {
          data: [root],
          pagination: {
            hasNextPage: false,
            hasPrevPage: false,
            page: 1,
            size: 10,
            total: 1,
            totalPages: 1,
          },
          readers: {},
        },
      ],
    }

    const next = mergeThreadRepliesIntoPages(data, {
      rootCommentId: 'root',
      replies: [
        makeComment('child-2', '2026-03-14T10:02:00.000Z', {
          parentCommentId: 'child-1',
          rootCommentId: 'root',
        }),
      ],
      replyWindow: {
        hasHidden: false,
        hiddenCount: 0,
        returned: 3,
        threshold: 20,
        total: 3,
      },
    })

    expect(
      next.pages[0]?.data[0]?.replies.map((comment) => comment.id),
    ).toEqual(['child-1', 'child-2', 'child-3'])
    expect(next.pages[0]?.data[0]?.replyWindow.hasHidden).toBe(false)
  })
})
