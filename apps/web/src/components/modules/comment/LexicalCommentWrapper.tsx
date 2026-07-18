'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { useMemo, useRef, useSyncExternalStore } from 'react'

import { apiClient } from '~/lib/request'
import { buildCommentsQueryKey } from '~/queries/keys'

import type { BlockInfo } from './anchor-utils'
import { extractBlockInfos } from './anchor-utils'
import { CommentAnchorHighlight } from './CommentAnchorHighlight'
import { CommentBlockGutter } from './CommentBlockGutter'
import { normalizeCommentThreadPage } from './contract'
import { RichContentElementProvider } from './RichContentElementContext'
import {
  type CommentThreadInfiniteData,
  type CommentWithAnchor,
  flattenThreadComments,
} from './thread'

function useAnchorCommentsQuery(refId: string): CommentWithAnchor[] {
  const { data } = useQuery({
    queryKey: ['comments', refId, 'anchors'],
    queryFn: async () => {
      const response = await apiClient.comment.getByRefId(refId, {
        page: 1,
        size: 50,
        sort: 'newest',
      })
      return normalizeCommentThreadPage(response, 1, 50)
    },
  })

  return useMemo(() => {
    if (!data) return []
    return flattenThreadComments(data.data).filter((comment) => comment.anchor)
  }, [data])
}

function useCachedCommentsData(refId: string): CommentWithAnchor[] {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => buildCommentsQueryKey(refId), [refId])
  const queryCache = queryClient.getQueryCache()

  const data = useSyncExternalStore(
    (onStoreChange) => {
      const unsubscribe = queryCache.subscribe((event) => {
        if (
          event.type === 'updated' &&
          event.query.queryKey[0] === queryKey[0] &&
          event.query.queryKey[1] === queryKey[1]
        ) {
          onStoreChange()
        }
      })
      return unsubscribe
    },
    () => queryClient.getQueryData<CommentThreadInfiniteData>(queryKey),
    () => null as CommentThreadInfiniteData | null,
  )

  return useMemo(() => {
    if (!data) return []
    return data.pages.flatMap((page) => flattenThreadComments(page.data))
  }, [data])
}

function useMergedAnchorComments(refId: string): CommentWithAnchor[] {
  const eagerComments = useAnchorCommentsQuery(refId)
  const cachedComments = useCachedCommentsData(refId)

  return useMemo(() => {
    const map = new Map<string, CommentWithAnchor>()
    for (const c of eagerComments) map.set(c.id, c)
    for (const c of cachedComments) {
      if (c.anchor) map.set(c.id, c)
    }
    return [...map.values()]
  }, [eagerComments, cachedComments])
}

export function LexicalCommentWrapper({
  content,
  refId,
  title: _title,
  children,
  translationLang,
}: PropsWithChildren<{
  content: string
  refId: string
  title: string
  translationLang?: string | null
}>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const blockInfos = useMemo<BlockInfo[]>(
    () => extractBlockInfos(content),
    [content],
  )

  const currentLang = translationLang ?? null

  const comments = useMergedAnchorComments(refId)

  return (
    <div className="group/comment-block relative lg:pr-8" ref={containerRef}>
      {children}
      <RichContentElementProvider containerRef={containerRef}>
        <CommentBlockGutter
          blockInfos={blockInfos}
          comments={comments}
          containerRef={containerRef}
          currentLang={currentLang}
          refId={refId}
        />
        <CommentAnchorHighlight
          blockInfos={blockInfos}
          comments={comments}
          containerRef={containerRef}
          currentLang={currentLang}
          refId={refId}
        />
      </RichContentElementProvider>
    </div>
  )
}
