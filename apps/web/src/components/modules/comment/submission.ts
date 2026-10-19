import type { CommentModel } from '@mx-space/api-client'

/** Submission receipts are private and must not enter shared comment caches. */
export const normalizeCommentSubmission = (response: CommentModel) => {
  const { moderation, ...comment } = response
  const status =
    moderation?.status ??
    (comment.moderationStatus === 'rejected' || comment.state === 2
      ? 'rejected'
      : comment.moderationStatus === 'pending' ||
          comment.moderationStatus === 'manual'
        ? 'pending'
        : 'published')
  return {
    comment,
    status,
    reviewer:
      moderation?.status === 'pending' ? moderation.reviewer : undefined,
  }
}
