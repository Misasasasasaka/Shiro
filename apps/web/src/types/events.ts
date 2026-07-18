import type { NoteModel } from '@mx-space/api-client'
import type { BusinessEvents } from '@mx-space/webhook'

export const EventTypes = {
  ARTICLE_READ_COUNT_UPDATE:
    'ARTICLE_READ_COUNT_UPDATE' as BusinessEvents.ARTICLE_READ_COUNT_UPDATE,
  COMMENT_CREATE: 'COMMENT_CREATE' as BusinessEvents.COMMENT_CREATE,
  COMMENT_UPDATE: 'COMMENT_UPDATE' as BusinessEvents.COMMENT_UPDATE,
  NOTE_CREATE: 'NOTE_CREATE' as BusinessEvents.NOTE_CREATE,
  NOTE_DELETE: 'NOTE_DELETE' as BusinessEvents.NOTE_DELETE,
  NOTE_UPDATE: 'NOTE_UPDATE' as BusinessEvents.NOTE_UPDATE,
  PAGE_CREATE: 'PAGE_CREATE' as BusinessEvents.PAGE_CREATE,
  PAGE_DELETE: 'PAGE_DELETE' as BusinessEvents.PAGE_DELETE,
  PAGE_UPDATE: 'PAGE_UPDATE' as BusinessEvents.PAGE_UPDATE,
  POST_CREATE: 'POST_CREATE' as BusinessEvents.POST_CREATE,
  POST_DELETE: 'POST_DELETE' as BusinessEvents.POST_DELETE,
  POST_UPDATE: 'POST_UPDATE' as BusinessEvents.POST_UPDATE,
  SAY_CREATE: 'SAY_CREATE' as BusinessEvents.SAY_CREATE,
  SAY_DELETE: 'SAY_DELETE' as BusinessEvents.SAY_DELETE,
  SAY_UPDATE: 'SAY_UPDATE' as BusinessEvents.SAY_UPDATE,
  VISITOR_OFFLINE: 'VISITOR_OFFLINE' as BusinessEvents.VISITOR_OFFLINE,
  VISITOR_ONLINE: 'VISITOR_ONLINE' as BusinessEvents.VISITOR_ONLINE,
} as const

export type ClientBusinessEvent = (typeof EventTypes)[keyof typeof EventTypes]

export interface EventTypesPayload {
  [EventTypes.VISITOR_ONLINE]: { online: number }
  [EventTypes.VISITOR_OFFLINE]: { online: number }
  [EventTypes.NOTE_UPDATE]: NoteModel
}

export enum SocketEmitEnum {
  Join = 'join',
  Leave = 'leave',
  UpdateSid = 'updateSid',
  UpdateLang = 'updateLang',
}
