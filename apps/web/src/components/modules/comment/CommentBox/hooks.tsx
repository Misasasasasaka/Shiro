'use client'

import {
  type AnonymousCommentDto,
  CollectionRefTypes,
  type CommentModel,
  type ReaderCommentDto,
  type RecentlyModel,
} from '@mx-space/api-client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ExtractAtomValue } from 'jotai'
import { atom, useAtomValue } from 'jotai'
import { atomWithStorage, selectAtom } from 'jotai/utils'
import { useTranslations } from 'next-intl'
import type { PropsWithChildren } from 'react'
import { use, useCallback } from 'react'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { useSessionReader } from '~/atoms/hooks/reader'
import { apiClient } from '~/lib/request'
import { getErrorMessageFromRequestError } from '~/lib/request.shared'
import { jotaiStore } from '~/lib/store'
import { toast } from '~/lib/toast'
import { buildCommentsQueryKey } from '~/queries/keys'

import type { CommentAnchor } from '../types'
import { MAX_COMMENT_TEXT_LENGTH } from './constants'
import type { createInitialValue } from './providers'
import {
  CommentBoxContext,
  CommentBoxLifeCycleContext,
  CommentCompactContext,
  CommentCompletedCallbackContext,
  CommentIsReplyContext,
  CommentOriginalRefIdContext,
} from './providers'

export const useCommentCompact = () => use(CommentCompactContext)
export const useUseCommentReply = () => use(CommentIsReplyContext)

export const useCommentOriginalRefId = () => {
  const fallbackRefId = useAtomValue(use(CommentBoxContext).refId)
  return use(CommentOriginalRefIdContext) || fallbackRefId
}

export const useCommentCompletedCallback = () =>
  use(CommentCompletedCallbackContext)

export const useCommentBoxTextValue = () =>
  useAtomValue(use(CommentBoxContext).text)

export const useCommentBoxRefIdValue = () =>
  useAtomValue(use(CommentBoxContext).refId)

export const useGetCommentBoxAtomValues = () => use(CommentBoxContext)
export const useCommentBoxLifeCycle = () => use(CommentBoxLifeCycleContext)

// ReactNode 导致 tsx 无法推断，过于复杂
const commentActionLeftSlotAtom = atom(null as PropsWithChildren['children'])
export const useCommentActionLeftSlot = () =>
  useAtomValue(commentActionLeftSlotAtom)

export const setCommentActionLeftSlot = (slot: PropsWithChildren['children']) =>
  jotaiStore.set(commentActionLeftSlotAtom, slot)

export const useCommentBoxHasText = () =>
  useAtomValue(
    selectAtom(
      use(CommentBoxContext).text,
      useCallback((v) => v.length > 0, []),
    ),
  )

export const useCommentBoxTextIsOversize = () =>
  useAtomValue(
    selectAtom(
      use(CommentBoxContext).text,
      useCallback((v) => v.length > MAX_COMMENT_TEXT_LENGTH, []),
    ),
  )
type CommentContextValue = ReturnType<typeof createInitialValue>

type CommentBoxValueMap = {
  [Key in keyof CommentContextValue]: ExtractAtomValue<CommentContextValue[Key]>
}
type SetCommentBoxArgs = {
  [Key in keyof CommentBoxValueMap]: [Key, CommentBoxValueMap[Key]]
}[keyof CommentBoxValueMap]

export const useSetCommentBoxValues = () => {
  const ctx = use(CommentBoxContext)
  return useCallback(
    (...args: SetCommentBoxArgs) => {
      switch (args[0]) {
        case 'anchor':
          jotaiStore.set(ctx.anchor, args[1])
          break
        case 'isWhisper':
          jotaiStore.set(ctx.isWhisper, args[1])
          break
        case 'syncToRecently':
          jotaiStore.set(ctx.syncToRecently, args[1])
          break
        case 'author':
        case 'avatar':
        case 'mail':
        case 'refId':
        case 'source':
        case 'text':
        case 'url':
          jotaiStore.set(ctx[args[0]], args[1])
          break
      }
    },
    [ctx],
  )
}

// Comment Mode

export const enum CommentBoxMode {
  'legacy',
  'with-auth',
}

const commentModeAtom = atomWithStorage(
  'comment-mode',
  CommentBoxMode['with-auth'],
)

export const useCommentMode = () => useAtomValue(commentModeAtom)
export const setCommentMode = (mode: CommentBoxMode) =>
  jotaiStore.set(commentModeAtom, mode)

export const useSendComment = () => {
  const t = useTranslations('comment')
  const commentRefId = useCommentBoxRefIdValue()
  const {
    text: textAtom,
    author: authorAtom,
    mail: mailAtom,
    url: urlAtom,

    anchor: anchorAtom,

    isWhisper: isWhisperAtom,
    syncToRecently: syncToRecentlyAtom,
  } = useGetCommentBoxAtomValues()
  const { afterSubmit } = useCommentBoxLifeCycle()
  const isLogged = useIsOwnerLogged()
  const reader = useSessionReader()
  const queryClient = useQueryClient()
  const isReply = useUseCommentReply()
  const originalRefId = useCommentOriginalRefId()
  const completedCallback = useCommentCompletedCallback()

  const wrappedCompletedCallback = <T extends CommentModel>(data: T): T => {
    completedCallback?.(data)
    return data
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async (refId: string) => {
      const text = jotaiStore.get(textAtom)
      const author = jotaiStore.get(authorAtom)
      const mail = jotaiStore.get(mailAtom)
      const url = jotaiStore.get(urlAtom)
      const anchor = jotaiStore.get(anchorAtom)
      const isWhisper = jotaiStore.get(isWhisperAtom)
      const isAuthenticated = isLogged || !!reader
      const guestDto: AnonymousCommentDto & { anchor?: CommentAnchor } = {
        author,
        mail,
        text,
        ...(url ? { url } : {}),
        ...(anchor ? { anchor } : {}),
        ...(isWhisper ? { isWhispers: true } : {}),
      }
      const readerDto: ReaderCommentDto & { anchor?: CommentAnchor } = {
        text,
        ...(anchor ? { anchor } : {}),
        ...(isWhisper ? { isWhispers: true } : {}),
      }

      // Reply Comment
      if (isReply) {
        const result = isAuthenticated
          ? await apiClient.comment.readerReply(refId, readerDto)
          : await apiClient.comment.guestReply(refId, guestDto)
        return wrappedCompletedCallback(result)
      }

      // Normal Comment
      const syncToRecently = jotaiStore.get(syncToRecentlyAtom)

      const result = isAuthenticated
        ? await apiClient.comment.readerComment(refId, readerDto)
        : await apiClient.comment.guestComment(refId, guestDto)

      if (isLogged && syncToRecently) {
        const refType = getCollectionRefType(location.pathname)
        void apiClient.recently.proxy
          .post<RecentlyModel>({
            data: {
              content: text,
              refId,
              refType,
            },
          })
          .then(() => toast.success(t('synced_to_thinking')))
      }
      return wrappedCompletedCallback(result)
    },
    mutationKey: [commentRefId, 'comment'],
    onError(error) {
      toast.error(getErrorMessageFromRequestError(error))
    },
    onSuccess() {
      afterSubmit?.()

      const toastCopy =
        isLogged || reader
          ? t('submit_success')
          : isReply
            ? t('reply_success')
            : t('comment_success')

      const commentListQueryKey = buildCommentsQueryKey(originalRefId)

      toast.success(toastCopy)
      jotaiStore.set(textAtom, '')
      jotaiStore.set(anchorAtom, null)
      queryClient.invalidateQueries({
        queryKey: commentListQueryKey,
      })
      queryClient.invalidateQueries({
        queryKey: ['comments', originalRefId, 'anchors'],
      })
    },
  })

  return [
    useCallback(() => mutate(commentRefId), [commentRefId, mutate]),
    isPending,
  ] as const
}

const getCollectionRefType = (pathname: string): CollectionRefTypes => {
  if (pathname.includes('/posts/')) return CollectionRefTypes.Post
  if (pathname.includes('/notes/')) return CollectionRefTypes.Note
  if (pathname.includes('/thinking')) return CollectionRefTypes.Recently
  return CollectionRefTypes.Page
}
