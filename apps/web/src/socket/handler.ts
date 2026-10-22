import { isDev } from '~/lib/env'
import { type ClientBusinessEvent, EventTypes } from '~/types/events'

import { articleReadCountHandlers } from './handlers/article-read-count'
import { commentHandlers } from './handlers/comment'
import { noteHandlers } from './handlers/note'
import { pageHandlers } from './handlers/page'
import { postHandlers } from './handlers/post'
import { sayHandlers } from './handlers/say'
import type {
  EventHandler,
  EventHandlerContext,
  SocketRouter,
} from './handlers/types'
import { visitorEvents, visitorHandler } from './handlers/visitor'
import { WsEvent } from './util'

const handlerMap: Record<string, EventHandler> = {
  ...postHandlers,
  ...noteHandlers,
  ...pageHandlers,
  ...sayHandlers,
  ...commentHandlers,
  ...articleReadCountHandlers,
}

for (const event of visitorEvents) {
  handlerMap[event] = visitorHandler
}

export const eventHandler = (
  type: string,
  data: unknown,
  router?: SocketRouter,
) => {
  const ctx: EventHandlerContext = { router }
  const handler = handlerMap[type]

  if (handler) {
    handler(data, ctx)
  } else if (isDev) {
    console.info(type, data)
  }

  if (isBusinessEvent(type)) WsEvent.emit(type, data)
}

const businessEvents = new Set<string>(Object.values(EventTypes))
const isBusinessEvent = (type: string): type is ClientBusinessEvent =>
  businessEvents.has(type)
