import type { PostListOptions } from '@mx-space/api-client'

export type PostSortBy = NonNullable<PostListOptions['sortBy']>

const sortableFields = new Set<PostSortBy>([
  'categoryId',
  'title',
  'createdAt',
  'modifiedAt',
  'pinAt',
])

export const normalizePostSortBy = (
  value: string | null | undefined,
): PostSortBy | undefined => {
  if (!value) return undefined

  // Preserve old bookmarks while sending only Core 13 field names.
  if (value === 'created') return 'createdAt'
  if (value === 'modified') return 'modifiedAt'
  return sortableFields.has(value as PostSortBy)
    ? (value as PostSortBy)
    : undefined
}
