import { BusinessEvents } from '@mx-space/webhook'
import { describe, expect, it } from 'vitest'

import { EventTypes, SocketEmitEnum } from '~/types/events'

import { getDeletedId } from './handlers/types'
import {
  articleRoomName,
  createSocketEmission,
  gatewayWebSocketUrl,
  parseGatewayEvent,
} from './protocol'

describe('Core 14 realtime protocol', () => {
  it.each([
    [SocketEmitEnum.Join, { room: 'article_9007199254740993001' }],
    [SocketEmitEnum.Leave, { room: 'article_9007199254740993001' }],
    [SocketEmitEnum.UpdateSid, { sessionId: 'reader-id' }],
    [SocketEmitEnum.UpdateLang, { lang: 'zh-CN' }],
  ])(
    'sends %s using versioned native WebSocket envelopes',
    (event, payload) => {
      expect(createSocketEmission(event, payload)).toEqual({
        v: 1,
        event,
        payload,
      })
    },
  )

  it('matches the Core 14 webhook event names', () => {
    for (const [key, value] of Object.entries(EventTypes)) {
      expect(value).toBe(BusinessEvents[key as keyof typeof BusinessEvents])
    }
  })

  it.each([
    ['https://core.example/', 'wss://core.example/ws/web'],
    ['http://localhost:2333', 'ws://localhost:2333/ws/web'],
    ['wss://core.example/blog/', 'wss://core.example/blog/ws/web'],
  ])('builds the native gateway URL for %s', (origin, expected) => {
    expect(gatewayWebSocketUrl(origin)).toBe(expected)
  })

  it('parses native gateway events without converting Snowflake identifiers', () => {
    const payload = { count: 3, id: '9007199254740993001', type: 'post' }
    const event = { v: 1, event: 'article.read_count_update', payload }
    for (const value of [event, JSON.stringify(event)]) {
      expect(parseGatewayEvent(value)).toEqual({
        data: payload,
        type: event.event,
      })
    }
  })

  it.each([
    '{',
    null,
    [],
    { v: 2, event: 'post.create' },
    { v: 1, event: '' },
    { type: 'POST_CREATE', data: {} },
    { v: 1, event: 'post.create', id: 42 },
  ])('ignores invalid or obsolete frames: %j', (value) => {
    expect(parseGatewayEvent(value)).toBeNull()
  })

  it('keeps Snowflake delete payloads and article rooms as strings', () => {
    const id = '9007199254740993001'
    expect(getDeletedId(id)).toBe(id)
    expect(getDeletedId({ data: id })).toBe(id)
    expect(articleRoomName(id)).toBe(`article_${id}`)
  })
})
