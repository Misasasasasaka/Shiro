import { BusinessEvents } from '@mx-space/webhook'
import { describe, expect, it } from 'vitest'

import { EventTypes, SocketEmitEnum } from '~/types/events'

import { getDeletedId } from './handlers/types'
import {
  articleRoomName,
  buildGatewayUrl,
  createSocketEmission,
  parseGatewayEvent,
} from './protocol'

describe('Core 14 realtime protocol', () => {
  it.each([
    [SocketEmitEnum.Join, { room: 'article_9007199254740993001' }],
    [SocketEmitEnum.Leave, { room: 'article_9007199254740993001' }],
    [SocketEmitEnum.UpdateSid, { sessionId: 'reader-id' }],
    [SocketEmitEnum.UpdateLang, { lang: 'zh-CN' }],
  ] as const)('builds a v1 %s command', (event, payload) => {
    expect(createSocketEmission(event, payload)).toEqual({
      event,
      payload,
      v: 1,
    })
  })

  it('parses string and object gateway events', () => {
    const event = {
      event: 'article.read_count_update',
      payload: { count: 3, id: '9007199254740993001', type: 'post' },
      v: 1,
    }
    const expected = { data: event.payload, type: event.event }
    expect(parseGatewayEvent(JSON.stringify(event))).toEqual(expected)
    expect(parseGatewayEvent(event)).toEqual(expected)
  })

  it.each([
    'invalid json',
    null,
    { data: {}, type: 'POST_CREATE' },
    { event: 'post.create', v: 2 },
    { event: '', v: 1 },
    { event: 'post.create', id: 123, v: 1 },
  ])('rejects invalid or incompatible gateway frames: %j', (frame) => {
    expect(parseGatewayEvent(frame)).toBeNull()
  })

  it('matches the current webhook business event names', () => {
    for (const [key, event] of Object.entries(EventTypes)) {
      expect(event).toBe(BusinessEvents[key as keyof typeof BusinessEvents])
    }
  })

  it.each([
    ['https://core.example', undefined, 'wss://core.example/ws/web'],
    ['https://core.example///', undefined, 'wss://core.example/ws/web'],
    ['http://localhost:2333', undefined, 'ws://localhost:2333/ws/web'],
    ['wss://core.example', undefined, 'wss://core.example/ws/web'],
    ['ws://core.example/ws/web/', undefined, 'ws://core.example/ws/web'],
    ['https://example.com/core/', undefined, 'wss://example.com/core/ws/web'],
    ['', 'https://shiro.example', 'wss://shiro.example/ws/web'],
    ['/core', 'https://shiro.example', 'wss://shiro.example/core/ws/web'],
  ])('resolves gateway %s with origin %s', (gateway, origin, expected) => {
    expect(buildGatewayUrl(gateway, origin)).toBe(expected)
  })

  it('treats Snowflake delete payloads as strings', () => {
    const id = '9007199254740993001'
    expect(getDeletedId(id)).toBe(id)
    expect(getDeletedId({ data: id })).toBe(id)
    expect(typeof getDeletedId(id)).toBe('string')
  })

  it('builds the Core gateway article room name', () => {
    expect(articleRoomName('9007199254740993001')).toBe(
      'article_9007199254740993001',
    )
  })
})
