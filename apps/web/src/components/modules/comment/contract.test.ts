import { CollectionRefTypes } from '@mx-space/api-client'
import { describe, expect, it } from 'vitest'

import { normalizeCommentThreadPage, normalizeThreadReplies } from './contract'

const comment = (id: string, overrides: Record<string, unknown> = {}) => ({
  agent: null,
  anchor: null,
  authProvider: null,
  author: `reader-${id}`,
  avatar: null,
  createdAt: '2026-07-17T00:00:00.000Z',
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
  readerId: 'reader-id',
  refId: '9007199254740993001',
  refType: CollectionRefTypes.Post,
  replyCount: 0,
  rootCommentId: null,
  state: 1,
  text: `comment-${id}`,
  url: null,
  ...overrides,
})

describe('Core 13 comment response contract', () => {
  it('reads V3 pagination from response meta and embedded readers', () => {
    const root = {
      ...comment('root'),
      reader: {
        email: 'reader@example.com',
        handle: 'reader',
        image: 'https://example.com/avatar.png',
        name: 'Reader',
      },
      replies: [
        comment('reply', {
          parentCommentId: 'root',
          rootCommentId: 'root',
        }),
      ],
      replyWindow: {
        hasHidden: true,
        hiddenCount: 1,
        nextCursor: 'cursor-1',
        returned: 1,
        threshold: 20,
        total: 2,
      },
    }
    const page = normalizeCommentThreadPage(
      {
        $meta: {
          pagination: { page: 2, size: 10, total: 21, totalPages: 3 },
        },
        $serialized: [root],
      },
      2,
      10,
    )

    expect(page.pagination).toMatchObject({
      hasNextPage: true,
      hasPrevPage: true,
      page: 2,
      totalPages: 3,
    })
    expect(page.data[0]?.id).toBe('root')
    expect(page.data[0]?.replies[0]?.parentCommentId).toBe('root')
    expect(page.readers['reader-id']?.name).toBe('Reader')
  })

  it('keeps null anchors and deleted comments safe', () => {
    const page = normalizeCommentThreadPage({
      $serialized: {
        data: [
          {
            ...comment('deleted', {
              author: null,
              deletedAt: '2026-07-17T01:00:00.000Z',
              isDeleted: true,
            }),
            replies: [],
            replyWindow: null,
          },
        ],
        pagination: { page: 1, size: 20, total: 1, totalPages: 1 },
        readers: {},
      },
    })

    expect(page.data[0]).toMatchObject({
      anchor: null,
      author: null,
      isDeleted: true,
    })
  })

  it('reads the nested data.meta shape returned by Core 13.14.1', () => {
    const page = normalizeCommentThreadPage({
      data: [
        {
          ...comment('nested-meta'),
          reader: {
            image: 'https://example.com/avatar.png',
            name: 'Core reader',
          },
          replies: [],
          replyWindow: null,
        },
      ],
      meta: {
        pagination: { page: 2, size: 3, total: 11, totalPages: 4 },
      },
    })

    expect(page.pagination).toMatchObject({
      page: 2,
      size: 3,
      total: 11,
      totalPages: 4,
    })
    expect(page.readers['reader-id']?.name).toBe('Core reader')
  })

  it('normalizes nullable reply cursors without inventing an ID', () => {
    const replies = normalizeThreadReplies({
      $serialized: {
        done: true,
        nextCursor: null,
        remaining: 0,
        replies: [comment('reply')],
      },
    })

    expect(replies.nextCursor).toBeUndefined()
    expect(replies.done).toBe(true)
    expect(replies.replies[0]?.id).toBe('reply')
  })
})
