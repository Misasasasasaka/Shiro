import type { NoteModel } from '@mx-space/api-client'
import type { BusinessEvents } from '@mx-space/webhook'

export const EventTypes = {
  ARTICLE_READ_COUNT_UPDATE:
    'article.read_count_update' as BusinessEvents.ARTICLE_READ_COUNT_UPDATE,
  COMMENT_CREATE: 'comment.create' as BusinessEvents.COMMENT_CREATE,
  COMMENT_UPDATE: 'comment.update' as BusinessEvents.COMMENT_UPDATE,
  NOTE_CREATE: 'note.create' as BusinessEvents.NOTE_CREATE,
  NOTE_DELETE: 'note.delete' as BusinessEvents.NOTE_DELETE,
  NOTE_UPDATE: 'note.update' as BusinessEvents.NOTE_UPDATE,
  PAGE_CREATE: 'page.create' as BusinessEvents.PAGE_CREATE,
  PAGE_DELETE: 'page.delete' as BusinessEvents.PAGE_DELETE,
  PAGE_UPDATE: 'page.update' as BusinessEvents.PAGE_UPDATE,
  POST_CREATE: 'post.create' as BusinessEvents.POST_CREATE,
  POST_DELETE: 'post.delete' as BusinessEvents.POST_DELETE,
  POST_UPDATE: 'post.update' as BusinessEvents.POST_UPDATE,
  SAY_CREATE: 'say.create' as BusinessEvents.SAY_CREATE,
  SAY_DELETE: 'say.delete' as BusinessEvents.SAY_DELETE,
  SAY_UPDATE: 'say.update' as BusinessEvents.SAY_UPDATE,
  VISITOR_OFFLINE: 'visitor.offline' as BusinessEvents.VISITOR_OFFLINE,
  VISITOR_ONLINE: 'visitor.online' as BusinessEvents.VISITOR_ONLINE,
} as const

export type ClientBusinessEvent = (typeof EventTypes)[keyof typeof EventTypes]

export interface EventTypesPayload {
  [EventTypes.VISITOR_ONLINE]: { online: number }
  [EventTypes.VISITOR_OFFLINE]: { online: number }
  [EventTypes.NOTE_UPDATE]: NoteModel
}

export enum SocketEmitEnum {
  Join = 'room.join',
  Leave = 'room.leave',
  UpdateSid = 'session.update',
  UpdateLang = 'lang.update',
}
