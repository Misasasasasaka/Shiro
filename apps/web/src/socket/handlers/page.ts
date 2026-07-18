import type { PageModel } from '@mx-space/api-client'

import { routeBuilder, Routes } from '~/lib/route-builder'
import { toast } from '~/lib/toast'
import {
  getCurrentPageData,
  setCurrentPageData,
} from '~/providers/page/CurrentPageDataProvider'
import { EventTypes } from '~/types/events'

import type { EventHandler } from './types'
import {
  getDeletedId,
  hasStringId,
  trackerRealtimeEvent,
  updateMessage,
} from './types'

const isPageEvent = (data: unknown): data is PageModel =>
  hasStringId(data) && typeof Reflect.get(data, 'slug') === 'string'

export const pageUpdateHandler: EventHandler = (data) => {
  if (!isPageEvent(data)) return
  const { slug } = data
  if (getCurrentPageData()?.slug === slug) {
    setCurrentPageData((draft) => {
      Object.assign(draft, data)
    })
    toast.info(updateMessage)
    trackerRealtimeEvent()
  }
}

export const pageCreateHandler: EventHandler = (data) => {
  if (!isPageEvent(data)) return
  toast.success(`有新的页面发布了：「${data.title}」`, {
    onClick: () => window.peek(`/${data.slug}`),
  })
  trackerRealtimeEvent()
}

export const pageDeleteHandler: EventHandler = (data, { router }) => {
  const id = getDeletedId(data)
  if (id && getCurrentPageData()?.id === id && router) {
    router.replace(routeBuilder(Routes.PageDeletd, {}))
    toast.error('页面已删除')
    trackerRealtimeEvent()
  }
}

export const pageHandlers = {
  [EventTypes.PAGE_CREATE]: pageCreateHandler,
  [EventTypes.PAGE_UPDATE]: pageUpdateHandler,
  [EventTypes.PAGE_DELETE]: pageDeleteHandler,
} as const
