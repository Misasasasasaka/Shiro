import type {
  NoteModel,
  PageModel,
  Pager,
  PaginateResult,
  PostModel,
} from '@mx-space/api-client'

interface SearchHighlight {
  keywords: string[]
  snippet: string | null
}

interface SearchResultMeta {
  lang: string
  isFallback: boolean
  highlight: SearchHighlight
}

export type CoreSearchResult =
  | (Pick<
      PostModel,
      'category' | 'createdAt' | 'id' | 'modifiedAt' | 'slug' | 'title'
    > &
      SearchResultMeta & { type: 'post' })
  | (Pick<NoteModel, 'createdAt' | 'id' | 'modifiedAt' | 'nid' | 'title'> &
      SearchResultMeta & { type: 'note' })
  | (Pick<PageModel, 'createdAt' | 'id' | 'modifiedAt' | 'slug' | 'title'> &
      SearchResultMeta & { type: 'page' })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const readNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const normalizePagination = (
  pagination: Record<string, unknown> | undefined,
  resultCount: number,
): Pager => {
  const page = readNumber(pagination?.page ?? pagination?.currentPage, 1)
  const size = readNumber(pagination?.size, resultCount)
  const total = readNumber(pagination?.total, resultCount)
  const totalPages = readNumber(
    pagination?.totalPages ?? pagination?.totalPage,
    total === 0 ? 0 : Math.max(1, Math.ceil(total / Math.max(size, 1))),
  )

  return {
    page,
    size,
    total,
    totalPages,
    hasNextPage:
      typeof pagination?.hasNextPage === 'boolean'
        ? pagination.hasNextPage
        : page < totalPages,
    hasPrevPage:
      typeof pagination?.hasPrevPage === 'boolean'
        ? pagination.hasPrevPage
        : page > 1,
  }
}

/**
 * Core 14 still nests search pagination and uses legacy pagination key names,
 * while the SDK describes native V3 pagination,
 * so this boundary validates and normalizes only that known SDK/Core mismatch.
 */
export const normalizeCoreSearchPage = <T>(
  value: unknown,
): PaginateResult<T> => {
  const serialized =
    isRecord(value) && '$serialized' in value ? value.$serialized : value
  const outer = isRecord(serialized) ? serialized : {}
  const nested =
    isRecord(outer.data) && Array.isArray(outer.data.data) ? outer.data : outer
  const data = Array.isArray(nested.data) ? (nested.data as T[]) : []
  const pagination = isRecord(nested.pagination) ? nested.pagination : undefined

  return {
    data,
    pagination: normalizePagination(pagination, data.length),
  }
}
