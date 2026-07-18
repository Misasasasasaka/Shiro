import type { PaginateResult, SayModel } from '@mx-space/api-client'
import type { InfiniteData } from '@tanstack/react-query'
import { produce } from 'immer'

import { sayQueryKey } from '~/components/modules/say/hooks'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { queryClient } from '~/providers/root/react-query-provider'
import { EventTypes } from '~/types/events'

import type { EventHandler } from './types'
import { hasStringId, trackerRealtimeEvent } from './types'

const isSayEvent = (data: unknown): data is SayModel =>
  hasStringId(data) && typeof Reflect.get(data, 'text') === 'string'

export const sayCreateHandler: EventHandler = (data) => {
  if (!isSayEvent(data)) return
  if (location.pathname === routeBuilder(Routes.Says, {})) {
    trackerRealtimeEvent()
    queryClient.setQueryData<InfiniteData<PaginateResult<SayModel>>>(
      sayQueryKey,
      (prev) =>
        produce(prev, (draft) => {
          draft?.pages?.[0].data.unshift(data)
        }),
    )
  }
}

export const sayHandlers = {
  [EventTypes.SAY_CREATE]: sayCreateHandler,
} as const
