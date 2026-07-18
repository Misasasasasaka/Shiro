import type { PostModel } from '@mx-space/api-client'
import * as React from 'react'

import {
  getTranslation,
  getViewingOriginal,
  setTranslationPending,
} from '~/atoms/translation'
import { IcTwotoneSignpost } from '~/components/icons/menu-collection'
import { DOMCustomEvents } from '~/constants/event'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { toast } from '~/lib/toast'
import {
  getGlobalCurrentPostData,
  setGlobalCurrentPostData,
} from '~/providers/post/CurrentPostDataProvider'
import { EventTypes } from '~/types/events'

import type { EventHandler } from './types'
import {
  getDeletedId,
  hasStringId,
  trackerRealtimeEvent,
  updateMessage,
} from './types'

const isPostEvent = (data: unknown): data is PostModel =>
  hasStringId(data) &&
  typeof Reflect.get(data, 'title') === 'string' &&
  typeof Reflect.get(data, 'slug') === 'string' &&
  typeof Reflect.get(data, 'category') === 'object'

export const postCreateHandler: EventHandler = (data) => {
  if (!isPostEvent(data)) return
  const { title, category, slug } = data
  toast.success(`有新的内容发布了：「${title}」`, {
    onClick: () => {
      window.peek(`/posts/${category.slug}/${slug}`)
    },
    iconElement: React.createElement(IcTwotoneSignpost),
  })

  trackerRealtimeEvent()
}

export const postUpdateHandler: EventHandler = (data) => {
  if (!isPostEvent(data)) return
  const post = data
  const currentData = getGlobalCurrentPostData()

  if (!currentData) return
  if (currentData.id !== post.id) return

  const contentChanged =
    currentData.text !== post.text || currentData.content !== post.content

  const currentTranslation = getTranslation()
  if (
    currentTranslation &&
    currentTranslation.refId === post.id &&
    !getViewingOriginal() &&
    contentChanged
  ) {
    setTranslationPending(true)
  }

  setGlobalCurrentPostData((draft) => {
    Object.assign(draft, post)
  })
  toast.info(updateMessage)
  trackerRealtimeEvent()

  if (contentChanged) {
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent(DOMCustomEvents.RefreshToc))
    }, 100)
  }
}

export const postDeleteHandler: EventHandler = (data, { router }) => {
  const id = getDeletedId(data)
  if (id && getGlobalCurrentPostData()?.id === id && router) {
    router.replace(routeBuilder(Routes.PageDeletd, {}))
    toast.error('文章已删除')
    trackerRealtimeEvent()
  }
}

export const postHandlers = {
  [EventTypes.POST_CREATE]: postCreateHandler,
  [EventTypes.POST_UPDATE]: postUpdateHandler,
  [EventTypes.POST_DELETE]: postDeleteHandler,
} as const
