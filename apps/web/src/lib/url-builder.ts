import type { NoteModel, PageModel, PostModel } from '@mx-space/api-client'

import { isDev } from '~/lib/env'
import { getAggregationData } from '~/providers/root/aggregation-data-provider'

export function urlBuilder(path = '') {
  if (isDev) return new URL(path, 'http://localhost:2323')
  return new URL(path, getAggregationData()?.url.webUrl)
}

const property = (model: unknown, key: string) => {
  if (typeof model !== 'object' || model === null) return
  return Reflect.get(model, key)
}

export function isPostModel(model: unknown): model is PostModel {
  return (
    isDefined(property(model, 'title')) &&
    isDefined(property(model, 'slug')) &&
    isDefined(property(model, 'categoryId'))
  )
}

export function isPageModel(model: unknown): model is PageModel {
  return (
    isDefined(property(model, 'title')) &&
    isDefined(property(model, 'slug')) &&
    isDefined(property(model, 'order'))
  )
}

export function isNoteModel(model: unknown): model is NoteModel {
  return (
    isDefined(property(model, 'title')) && isDefined(property(model, 'nid'))
  )
}

function buildUrl(model: PostModel | NoteModel | PageModel) {
  if (isPostModel(model)) {
    // TODO
    if (!model.category) {
      console.error('PostModel.category is missing!!!!!')
      return '#'
    }
    return `/posts/${model.category.slug}/${encodeURIComponent(model.slug)}`
  } else if (isPageModel(model)) {
    return `/${model.slug}`
  } else if (isNoteModel(model)) {
    return `/notes/${model.nid}`
  }

  return '/'
}

function isDefined(data: unknown) {
  return data !== undefined && data !== null
}

urlBuilder.build = buildUrl
