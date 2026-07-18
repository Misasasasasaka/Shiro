import type { InfiniteData } from '@tanstack/react-query'

import type { CommentThreadPage } from '~/components/modules/comment/thread'
import { queryClient } from '~/providers/root/react-query-provider'
import { buildCommentsQueryKey } from '~/queries/keys'
import { EventTypes } from '~/types/events'

import type { EventHandler } from './types'

export const commentCreateHandler: EventHandler = (data) => {
  if (typeof data !== 'object' || data === null) return
  const refId = Reflect.get(data, 'refId')
  const id = Reflect.get(data, 'id')
  if (typeof refId !== 'string' || typeof id !== 'string') return

  setTimeout(() => {
    const queryData = queryClient.getQueryData<InfiniteData<CommentThreadPage>>(
      buildCommentsQueryKey(refId),
    )

    if (!queryData) return
    for (const page of queryData.pages) {
      if (page.data.some((comment) => comment.id === id)) {
        return
      }
    }

    queryClient.invalidateQueries({
      queryKey: buildCommentsQueryKey(refId),
    })
  }, 1000)
}

export const commentHandlers = {
  [EventTypes.COMMENT_CREATE]: commentCreateHandler,
} as const
