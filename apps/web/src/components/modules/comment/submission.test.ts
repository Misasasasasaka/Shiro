import type { CommentModel } from '@mx-space/api-client'
import { describe, expect, it } from 'vitest'

import { normalizeCommentSubmission } from './submission'

const base = {
  id: '9007199254740993001',
  state: 0,
  text: 'Hello',
} as CommentModel

describe('Core 14 comment submissions', () => {
  it.each(['ai', 'owner'] as const)(
    'preserves pending %s review without sharing the receipt',
    (reviewer) => {
      const result = normalizeCommentSubmission({
        ...base,
        moderation: { status: 'pending', reviewer, receipt: 'private-receipt' },
      })
      expect(result).toEqual({ comment: base, status: 'pending', reviewer })
      expect(JSON.stringify(result)).not.toContain('private-receipt')
    },
  )

  it.each(['published', 'rejected'] as const)(
    'honors the server’s %s decision',
    (status) => {
      expect(
        normalizeCommentSubmission({ ...base, moderation: { status } }).status,
      ).toBe(status)
    },
  )

  it('handles responses without a moderation receipt', () => {
    expect(normalizeCommentSubmission(base).status).toBe('published')
    expect(
      normalizeCommentSubmission({ ...base, moderationStatus: 'manual' })
        .status,
    ).toBe('pending')
    expect(normalizeCommentSubmission({ ...base, state: 2 }).status).toBe(
      'rejected',
    )
  })
})
