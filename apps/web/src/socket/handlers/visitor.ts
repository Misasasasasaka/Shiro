import { setOnlineCount } from '~/atoms'
import { EventTypes } from '~/types/events'

import type { EventHandler } from './types'

export const visitorHandler: EventHandler = (data) => {
  if (typeof data !== 'object' || data === null) return
  const online = Reflect.get(data, 'online')
  if (typeof online !== 'number') return
  setOnlineCount(online)
}

export const visitorEvents = [
  EventTypes.VISITOR_ONLINE,
  EventTypes.VISITOR_OFFLINE,
] as const
