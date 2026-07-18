import type {
  CommentModel,
  CommentReplyWindow,
  PaginateResult,
  ReaderModel,
} from '@mx-space/api-client'
import type { InfiniteData } from '@tanstack/react-query'

import { type CommentAnchor, normalizeCommentAnchor } from './types'

export type CommentWithAnchor = Omit<CommentModel, 'anchor'> & {
  anchor: CommentAnchor | null
  new?: boolean
}

export type CommentThreadRecord = CommentWithAnchor & {
  replies: CommentWithAnchor[]
  replyWindow: CommentReplyWindow
}

export type CommentThreadViewItem = CommentThreadRecord & {
  children: CommentThreadViewItem[]
}

export type CommentThreadPage = PaginateResult<CommentThreadRecord> & {
  readers: Record<string, ReaderModel>
}
export type CommentThreadInfiniteData = InfiniteData<CommentThreadPage>

const toTimestamp = (date: string) => new Date(date).getTime()

const byCreatedAsc = (
  a: Pick<CommentModel, 'createdAt'>,
  b: Pick<CommentModel, 'createdAt'>,
) => toTimestamp(a.createdAt) - toTimestamp(b.createdAt)

const getParentCommentId = (
  parentCommentId: CommentModel['parentCommentId'],
) => {
  if (!parentCommentId) return null
  if (typeof parentCommentId === 'string') return parentCommentId
  return null
}

const createViewComment = (
  comment: CommentWithAnchor,
): CommentThreadViewItem => ({
  ...comment,
  children: [],
  replies: [],
  replyWindow: emptyReplyWindow,
})

const emptyReplyWindow: CommentReplyWindow = {
  hasHidden: false,
  hiddenCount: 0,
  returned: 0,
  threshold: 20,
  total: 0,
}

const normalizeReplyWindow = (
  window: CommentReplyWindow | null | undefined,
  returned: number,
): CommentReplyWindow => ({
  hasHidden: window?.hasHidden ?? false,
  hiddenCount: window?.hiddenCount ?? 0,
  nextCursor:
    typeof window?.nextCursor === 'string' ? window.nextCursor : undefined,
  returned: window?.returned ?? returned,
  threshold: window?.threshold ?? 20,
  total: window?.total ?? returned,
})

export const normalizeComment = (comment: CommentModel): CommentWithAnchor => ({
  ...comment,
  anchor: normalizeCommentAnchor(comment.anchor),
})

const sortChildrenDeep = (comment: CommentThreadViewItem) => {
  comment.children.sort(byCreatedAsc)
  for (const child of comment.children) {
    sortChildrenDeep(child)
  }
}

export const buildCommentTreeItem = (
  rootComment: CommentThreadRecord,
): CommentThreadViewItem => {
  const rootView = createViewComment(rootComment)
  const replyViews = rootComment.replies.map(createViewComment)

  const commentMap = new Map<string, CommentThreadViewItem>([
    [rootView.id, rootView],
    ...replyViews.map((reply) => [reply.id, reply] as const),
  ])

  for (const reply of replyViews.sort(byCreatedAsc)) {
    const parentId = getParentCommentId(reply.parentCommentId)
    const parent = (parentId && commentMap.get(parentId)) || rootView
    parent.children.push(reply)
  }

  sortChildrenDeep(rootView)

  return {
    ...rootView,
    replies: dedupeRepliesById(rootComment.replies),
    replyWindow: normalizeReplyWindow(
      rootComment.replyWindow,
      rootComment.replies.length,
    ),
  }
}

export const flattenThreadComments = (
  comments: CommentThreadRecord[],
): CommentWithAnchor[] => {
  const result: CommentWithAnchor[] = []
  for (const comment of comments) {
    result.push(comment, ...comment.replies)
  }
  return dedupeRepliesById(result)
}

export const dedupeRepliesById = <T extends Pick<CommentModel, 'id'>>(
  comments: readonly T[],
): T[] => {
  const seen = new Set<string>()
  const result: T[] = []
  for (const comment of comments) {
    if (seen.has(comment.id)) continue
    seen.add(comment.id)
    result.push(comment)
  }
  return result
}

export const mergeThreadRepliesIntoPages = (
  data: CommentThreadInfiniteData,
  {
    rootCommentId,
    replies,
    replyWindow,
  }: {
    rootCommentId: string
    replies: CommentWithAnchor[]
    replyWindow: CommentReplyWindow
  },
): CommentThreadInfiniteData => ({
  ...data,
  pages: data.pages.map((page) => ({
    ...page,
    data: page.data.map((comment) => {
      if (comment.id !== rootCommentId) return comment

      return {
        ...comment,
        replies: dedupeRepliesById([...comment.replies, ...replies]).sort(
          byCreatedAsc,
        ),
        replyWindow: normalizeReplyWindow(replyWindow, replies.length),
      }
    }),
  })),
})
