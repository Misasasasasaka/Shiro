'use client'

import type { RecentlyModel } from '@mx-space/api-client'
import {
  RecentlyAttitudeEnum,
  RecentlyAttitudeResultEnum,
} from '@mx-space/api-client'
import {
  queryOptions,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

import { sample } from '~/lib/lodash'
import {
  getRecentlyAttitudeCounts,
  submitRecentlyAttitude,
} from '~/lib/recently-attitude'
import { toast } from '~/lib/toast'

const messages = {
  [RecentlyAttitudeEnum.Up]: {
    added: ['(￣▽￣*) ゞ', '(＾▽＾)'],
    removed: ['[○･｀Д´･○]'],
  },
  [RecentlyAttitudeEnum.Down]: {
    added: ['(╥_╥)'],
    removed: ['ヽ (・∀・) ﾉ'],
  },
}

export const ThinkingAttitudeButtons = ({
  item,
}: {
  item: Pick<RecentlyModel, 'id' | 'up' | 'down'>
}) => {
  const t = useTranslations('thinking')
  const common = useTranslations('common')
  const queryClient = useQueryClient()
  const mutationKey = ['recently-attitude', item.id]
  const mutationFilter = { mutationKey, exact: true }
  const isSubmitting = useIsMutating(mutationFilter) > 0
  const countQuery = queryOptions({
    queryKey: ['recently-attitude-counts', item.id],
    queryFn: () => getRecentlyAttitudeCounts(item.id),
    meta: { persist: false },
    networkMode: 'always',
    retry: false,
  })
  const { data: counts = item } = useQuery({
    ...countQuery,
    // Use counts from the page until the reader interacts with this item.
    enabled: (query) => query.state.data !== undefined,
    staleTime: 30_000,
  })

  const { mutate } = useMutation({
    mutationKey,
    mutationFn: (attitude: RecentlyAttitudeEnum) =>
      submitRecentlyAttitude(item.id, attitude),
    networkMode: 'always',
    retry: false,
    onError: () => {
      toast.error(t('attitude_failed'))
    },
    onSuccess: async ({ code }, attitude) => {
      try {
        await queryClient.cancelQueries({
          queryKey: countQuery.queryKey,
          exact: true,
        })
        await queryClient.fetchQuery({ ...countQuery, staleTime: 0 })
      } catch {
        toast.warn(t('attitude_count_refresh_failed'))
        return
      }

      const result =
        code === RecentlyAttitudeResultEnum.Inc ? 'added' : 'removed'
      toast.success(sample(messages[attitude][result]))
    },
  })
  const handleAttitude = (attitude: RecentlyAttitudeEnum) => {
    if (queryClient.isMutating(mutationFilter) === 0) {
      mutate(attitude)
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => handleAttitude(RecentlyAttitudeEnum.Up)}
      >
        <i className="i-mingcute-heart-line" />
        <span className="sr-only">{common('like')}</span>
        <span>{counts.up}</span>
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => handleAttitude(RecentlyAttitudeEnum.Down)}
      >
        <i className="i-mingcute-heart-crack-line" />
        <span className="sr-only">{common('dislike')}</span>
        <span>{counts.down}</span>
      </button>
    </>
  )
}
