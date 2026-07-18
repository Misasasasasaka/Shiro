import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { apiClient } from '~/lib/request'
import { buildCommentsQueryKey } from '~/queries/keys'

import { normalizeCommentThreadPage } from './contract'

export function useCommentsQuery(refId: string) {
  const key = useMemo(() => buildCommentsQueryKey(refId), [refId])
  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: key,
    queryFn: async ({ queryKey, pageParam }) => {
      const page = pageParam
      const [, refId] = queryKey as [string, string]
      const response = await apiClient.comment.getByRefId(refId, {
        page,
        size: 20,
        sort: 'pinned',
      })

      return normalizeCommentThreadPage(response, page, 20)
    },

    meta: {
      persist: false,
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined,
    initialPageParam: 1,
  })

  return {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
  }
}
