import { describe, expect, it } from 'vitest'

import { SocketEmitEnum } from '~/types/events'

import { getDeletedId } from './handlers/types'
import {
  articleRoomName,
  createSocketEmission,
  parseGatewayEvent,
} from './protocol'

describe('Core 13 realtime protocol', () => {
  it.each([
    [SocketEmitEnum.Join, { roomName: 'article_9007199254740993001' }],
    [SocketEmitEnum.Leave, { roomName: 'article_9007199254740993001' }],
    [SocketEmitEnum.UpdateSid, { sessionId: 'reader-id' }],
    [SocketEmitEnum.UpdateLang, { lang: 'zh-CN' }],
  ])('preserves %s emission payloads', (type, payload) => {
    expect(createSocketEmission(type, payload)).toEqual({ payload, type })
  })

  it('parses string and object gateway events', () => {
    const event = {
      data: { count: 3, id: '9007199254740993001', type: 'post' },
      type: 'ARTICLE_READ_COUNT_UPDATE',
    }
    expect(parseGatewayEvent(JSON.stringify(event))).toEqual(event)
    expect(parseGatewayEvent(event)).toEqual(event)
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
