import { TrackerAction } from '~/constants/tracker'

export interface SocketRouter {
  replace(href: string): void
}

export interface EventHandlerContext {
  router?: SocketRouter
}

export type EventHandler = (data: unknown, ctx: EventHandlerContext) => void

export const hasStringId = (data: unknown): data is { id: string } =>
  typeof data === 'object' &&
  data !== null &&
  typeof Reflect.get(data, 'id') === 'string'

export const getDeletedId = (data: unknown): string | undefined => {
  if (typeof data === 'string') return data
  if (typeof data !== 'object' || data === null) return undefined
  const nestedId = Reflect.get(data, 'data')
  return typeof nestedId === 'string' ? nestedId : undefined
}

export const trackerRealtimeEvent = (label = 'Socket Realtime Event') => {
  document.dispatchEvent(
    new CustomEvent('impression', {
      detail: {
        action: TrackerAction.Impression,
        label,
      },
    }),
  )
}

export const updateMessage = '由于作者更新了此文章/内容，所以页面内容自动刷新了'
