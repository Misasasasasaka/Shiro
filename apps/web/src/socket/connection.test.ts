import type { WsClient } from '@mx-space/ws-client'
import { describe, expect, it, vi } from 'vitest'

import { EventTypes, SocketEmitEnum } from '~/types/events'

import { GatewayConnection } from './connection'
import { createSocketEmission } from './protocol'

const setup = () => {
  const listeners = new Map<string, (payload: unknown) => void>()
  const client: WsClient = {
    state: 'connecting',
    on: (event, listener) => {
      listeners.set(event, listener as (payload: unknown) => void)
      return () => {
        listeners.delete(event)
      }
    },
    send: vi.fn(),
    request: vi.fn(),
    close: vi.fn(),
  }
  const post = vi.fn()
  const createClient = vi.fn(() => client)
  const connection = new GatewayConnection(
    {
      url: 'https://core.example',
      socketSessionId: 'reader',
      lang: 'en',
    },
    post,
    createClient,
  )
  const receive = (event: string, payload?: unknown) =>
    listeners.get(event)?.(payload)
  return { client, post, createClient, connection, receive }
}

describe('Core 14 worker connection', () => {
  it('waits for Core initialization, then restores only active subscriptions after reconnect', () => {
    const { client, post, connection, receive } = setup()
    connection.emit(
      createSocketEmission(SocketEmitEnum.Join, { room: 'article_a' }),
    )
    receive('$state', 'open')
    expect(client.send).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalledWith({ type: 'connect' })
    receive('gateway.connect', 'WebSocket connected')
    expect(client.send).toHaveBeenCalledWith('room.join', { room: 'article_a' })
    expect(post).toHaveBeenCalledWith({ type: 'connect' })

    receive('$state', 'reconnecting')
    expect(post).toHaveBeenCalledWith({ type: 'disconnect' })
    vi.mocked(client.send).mockClear()
    connection.emit(
      createSocketEmission(SocketEmitEnum.Leave, { room: 'article_a' }),
    )
    connection.emit(
      createSocketEmission(SocketEmitEnum.Join, { room: 'article_b' }),
    )
    connection.emit(
      createSocketEmission(SocketEmitEnum.UpdateSid, {
        sessionId: 'new-reader',
      }),
    )
    connection.emit(
      createSocketEmission(SocketEmitEnum.UpdateLang, { lang: 'ja' }),
    )
    expect(client.send).not.toHaveBeenCalled()
    receive('gateway.connect', 'WebSocket connected')
    expect(vi.mocked(client.send).mock.calls).toEqual([
      ['session.update', { sessionId: 'new-reader' }],
      ['lang.update', { lang: 'ja' }],
      ['room.join', { room: 'article_b' }],
    ])
  })

  it('forwards business events and lets the SDK manage reconnects', () => {
    const { client, post, connection, receive, createClient } = setup()
    const payload = { id: '9007199254740993001', text: 'New comment' }
    receive(EventTypes.COMMENT_CREATE, payload)
    expect(post).toHaveBeenCalledWith({
      type: 'message',
      payload: { v: 1, event: 'comment.create', payload },
    })
    connection.reconnect()
    expect(createClient).toHaveBeenCalledTimes(1)
    connection.close()
    expect(client.close).toHaveBeenCalledOnce()
  })
})
