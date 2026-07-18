import type {
  CommentModel,
  CommentReplyWindow,
  ReaderModel,
} from '@mx-space/api-client'

import {
  type CommentThreadPage,
  type CommentThreadRecord,
  type CommentWithAnchor,
  normalizeComment,
} from './thread'

const property = (value: unknown, key: string): unknown => {
  if (typeof value !== 'object' || value === null) return undefined
  return Reflect.get(value, key)
}

const numberProperty = (value: unknown, key: string) => {
  const result = property(value, key)
  return typeof result === 'number' && Number.isFinite(result)
    ? result
    : undefined
}

const booleanProperty = (value: unknown, key: string) => {
  const result = property(value, key)
  return typeof result === 'boolean' ? result : undefined
}

const isCommentModel = (value: unknown): value is CommentModel =>
  typeof property(value, 'id') === 'string' &&
  typeof property(value, 'refId') === 'string' &&
  typeof property(value, 'createdAt') === 'string' &&
  typeof property(value, 'text') === 'string'

const isReaderModel = (value: unknown): value is ReaderModel =>
  typeof property(value, 'name') === 'string' &&
  typeof property(value, 'image') === 'string'

const normalizeReplyWindow = (
  value: unknown,
  returned: number,
): CommentReplyWindow => {
  const cursor = property(value, 'nextCursor')
  const total = numberProperty(value, 'total') ?? returned
  const remaining = Math.max(total - returned, 0)

  return {
    hasHidden:
      booleanProperty(value, 'hasHidden') ??
      (numberProperty(value, 'hiddenCount') ?? remaining) > 0,
    hiddenCount: numberProperty(value, 'hiddenCount') ?? remaining,
    nextCursor: typeof cursor === 'string' ? cursor : undefined,
    returned: numberProperty(value, 'returned') ?? returned,
    threshold: numberProperty(value, 'threshold') ?? 20,
    total,
  }
}

const normalizeThreadItem = (value: unknown): CommentThreadRecord | null => {
  if (!isCommentModel(value)) return null

  const rawReplies = property(value, 'replies')
  const replies = Array.isArray(rawReplies)
    ? rawReplies.filter(isCommentModel).map(normalizeComment)
    : []

  return {
    ...normalizeComment(value),
    replies,
    replyWindow: normalizeReplyWindow(
      property(value, 'replyWindow'),
      replies.length,
    ),
  }
}

const collectReaderMap = (value: unknown) => {
  const readers: Record<string, ReaderModel> = {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return readers
  }

  for (const [readerId, reader] of Object.entries(value)) {
    if (isReaderModel(reader)) readers[readerId] = reader
  }
  return readers
}

const collectEmbeddedReaders = (
  values: readonly unknown[],
  readers: Record<string, ReaderModel>,
) => {
  for (const value of values) {
    const reader = property(value, 'reader')
    const readerId = property(value, 'readerId')
    if (isReaderModel(reader) && typeof readerId === 'string') {
      readers[readerId] = reader
    }

    const replies = property(value, 'replies')
    if (Array.isArray(replies)) collectEmbeddedReaders(replies, readers)
  }
}

export const normalizeCommentThreadPage = (
  response: unknown,
  fallbackPage = 1,
  fallbackSize = 20,
): CommentThreadPage => {
  const serialized = property(response, '$serialized')
  const payload = serialized ?? response
  const directData = Array.isArray(payload)
    ? payload
    : property(payload, 'data')
  const rawData = Array.isArray(directData) ? directData : []
  const data = rawData
    .map(normalizeThreadItem)
    .filter((item): item is CommentThreadRecord => item !== null)

  const meta = property(response, '$meta')
  const payloadMeta = property(payload, 'meta')
  const pagination =
    property(payload, 'pagination') ??
    property(payloadMeta, 'pagination') ??
    property(response, 'pagination') ??
    property(meta, 'pagination')
  const page = numberProperty(pagination, 'page') ?? fallbackPage
  const size = numberProperty(pagination, 'size') ?? fallbackSize
  const total = numberProperty(pagination, 'total') ?? data.length
  const totalPages =
    numberProperty(pagination, 'totalPages') ??
    Math.max(1, Math.ceil(total / Math.max(size, 1)))

  const readers = {
    ...collectReaderMap(property(payload, 'readers')),
    ...collectReaderMap(property(payloadMeta, 'readers')),
    ...collectReaderMap(property(response, 'readers')),
    ...collectReaderMap(property(meta, 'readers')),
  }
  collectEmbeddedReaders(rawData, readers)

  return {
    data,
    pagination: {
      hasNextPage:
        booleanProperty(pagination, 'hasNextPage') ?? page < totalPages,
      hasPrevPage: booleanProperty(pagination, 'hasPrevPage') ?? page > 1,
      page,
      size,
      total,
      totalPages,
    },
    readers,
  }
}

export interface NormalizedThreadReplies {
  done: boolean
  nextCursor?: string
  remaining: number
  replies: CommentWithAnchor[]
}

export const normalizeThreadReplies = (
  response: unknown,
): NormalizedThreadReplies => {
  const serialized = property(response, '$serialized')
  const payload = serialized ?? response
  const rawReplies = property(payload, 'replies')
  const replies = Array.isArray(rawReplies)
    ? rawReplies.filter(isCommentModel).map(normalizeComment)
    : []
  const cursor = property(payload, 'nextCursor')
  const nextCursor = typeof cursor === 'string' ? cursor : undefined
  const remaining = numberProperty(payload, 'remaining') ?? 0

  return {
    done: booleanProperty(payload, 'done') ?? !nextCursor,
    nextCursor,
    remaining,
    replies,
  }
}
