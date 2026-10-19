import { once } from 'node:events'

import { buildEnvelope, type WsEnvelope } from '@mx-space/ws-client/protocol'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { type WebSocket, WebSocketServer } from 'ws'

import { EventTypes, SocketEmitEnum } from '~/types/events'

import { GatewayConnection } from './connection'
import {
  buildGatewayUrl,
  createSocketEmission,
  parseGatewayEvent,
  type SocketWorkerOutput,
} from './protocol'

type Peer = {
  frames: WsEnvelope[]
  socket: WebSocket
  url: URL
}

const startGateway = async () => {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 })
  await once(server, 'listening')
  const address = server.address()
  if (typeof address !== 'object' || !address) throw new Error('Missing port')
  const origin = `http://127.0.0.1:${address.port}`
  const peers: Peer[] = []
  const output: SocketWorkerOutput[] = []

  server.on('connection', (socket, request) => {
    const peer: Peer = {
      frames: [],
      socket,
      url: new URL(request.url ?? '/', origin),
    }
    peers.push(peer)
    socket.on('message', (data) => {
      const frame = JSON.parse(data.toString()) as WsEnvelope
      peer.frames.push(frame)
      if (frame.event === 'ping') {
        socket.send(
          JSON.stringify(buildEnvelope('ack', { ok: true }, frame.id)),
        )
      }
    })
  })

  const connection = new GatewayConnection(
    {
      lang: 'en',
      socketSessionId: 'reader-initial',
      url: buildGatewayUrl(origin),
    },
    (message) => output.push(message),
  )

  onTestFinished(async () => {
    connection.close()
    for (const socket of server.clients) socket.terminate()
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  })

  const peerAt = async (index: number) => {
    await vi.waitFor(() => expect(peers.length).toBeGreaterThan(index), {
      timeout: 3000,
    })
    return peers[index]
  }

  const greet = async (peer: Peer) => {
    peer.socket.send(
      JSON.stringify(buildEnvelope('gateway.connect', 'WebSocket connected')),
    )
    await vi.waitFor(() => expect(connection.connected).toBe(true))
    await vi.waitFor(() => expect(peer.frames.length).toBeGreaterThanOrEqual(2))
  }

  return { connection, greet, output, peerAt }
}

describe('Core 14 gateway connection', () => {
  it('waits for Core readiness and sends the latest session, language and rooms', async () => {
    const { connection, greet, output, peerAt } = await startGateway()
    const peer = await peerAt(0)
    expect(peer.url.pathname).toBe('/ws/web')
    expect(peer.url.searchParams.get('socket_session_id')).toBe(
      'reader-initial',
    )
    expect(peer.url.searchParams.get('lang')).toBe('en')

    connection.emit(
      createSocketEmission(SocketEmitEnum.Join, { room: 'article_old' }),
    )
    connection.emit(
      createSocketEmission(SocketEmitEnum.Leave, { room: 'article_old' }),
    )
    connection.emit(
      createSocketEmission(SocketEmitEnum.Join, { room: 'article_current' }),
    )
    connection.emit(
      createSocketEmission(SocketEmitEnum.UpdateSid, {
        sessionId: 'reader-current',
      }),
    )
    connection.emit(
      createSocketEmission(SocketEmitEnum.UpdateLang, { lang: 'zh-CN' }),
    )

    expect(connection.connected).toBe(false)
    expect(output).toEqual([])
    expect(peer.frames).toEqual([])
    await greet(peer)
    await vi.waitFor(() => expect(peer.frames).toHaveLength(3))
    expect(peer.frames).toEqual([
      {
        event: 'session.update',
        payload: { sessionId: 'reader-current' },
        v: 1,
      },
      { event: 'lang.update', payload: { lang: 'zh-CN' }, v: 1 },
      { event: 'room.join', payload: { room: 'article_current' }, v: 1 },
    ])
    expect(output).toEqual([{ type: 'connect' }])
  })

  it('forwards the current business events and ignores malformed or legacy frames', async () => {
    const { greet, output, peerAt } = await startGateway()
    const peer = await peerAt(0)
    await greet(peer)

    peer.socket.send('invalid json')
    peer.socket.send(JSON.stringify({ data: {}, type: 'POST_CREATE' }))
    peer.socket.send(
      JSON.stringify({ event: 'post.create', payload: {}, v: 2 }),
    )

    const payload = {
      id: '9007199254740993001',
      online: 3,
      refId: '9007199254740993002',
    }
    for (const event of Object.values(EventTypes)) {
      peer.socket.send(JSON.stringify(buildEnvelope(event, payload)))
    }
    const events = () =>
      output.flatMap((message) =>
        message.type === 'message' ? [parseGatewayEvent(message.payload)] : [],
      )
    await vi.waitFor(() =>
      expect(events()).toHaveLength(Object.keys(EventTypes).length),
    )
    expect(events()).toEqual(
      Object.values(EventTypes).map((type) => ({ data: payload, type })),
    )
  })

  it('automatically reconnects and restores only rooms still being viewed', async () => {
    const { connection, greet, output, peerAt } = await startGateway()
    const first = await peerAt(0)
    await greet(first)
    connection.emit(
      createSocketEmission(SocketEmitEnum.Join, { room: 'article_old' }),
    )
    connection.emit(
      createSocketEmission(SocketEmitEnum.Join, { room: 'article_retained' }),
    )
    await vi.waitFor(() => expect(first.frames).toHaveLength(4))

    first.socket.terminate()
    await vi.waitFor(() => expect(connection.connected).toBe(false))
    connection.emit(
      createSocketEmission(SocketEmitEnum.Leave, { room: 'article_old' }),
    )
    connection.emit(
      createSocketEmission(SocketEmitEnum.UpdateSid, {
        sessionId: 'reader-updated',
      }),
    )
    connection.emit(
      createSocketEmission(SocketEmitEnum.UpdateLang, { lang: 'ja' }),
    )
    connection.emit(
      createSocketEmission(SocketEmitEnum.Join, { room: 'article_new' }),
    )

    const second = await peerAt(1)
    await greet(second)
    await vi.waitFor(() => expect(second.frames).toHaveLength(4))
    expect(second.frames).toEqual([
      {
        event: 'session.update',
        payload: { sessionId: 'reader-updated' },
        v: 1,
      },
      { event: 'lang.update', payload: { lang: 'ja' }, v: 1 },
      { event: 'room.join', payload: { room: 'article_retained' }, v: 1 },
      { event: 'room.join', payload: { room: 'article_new' }, v: 1 },
    ])
    expect(output.filter((message) => message.type !== 'message')).toEqual([
      { type: 'connect' },
      { type: 'disconnect' },
      { type: 'connect' },
    ])
  })

  it('keeps a shared article room until its last subscriber leaves', async () => {
    const { connection, greet, peerAt } = await startGateway()
    const peer = await peerAt(0)
    await greet(peer)
    const join = createSocketEmission(SocketEmitEnum.Join, {
      room: 'article_shared',
    })
    const leave = createSocketEmission(SocketEmitEnum.Leave, {
      room: 'article_shared',
    })
    connection.emit(join)
    connection.emit(join)
    connection.emit(leave)
    connection.emit(
      createSocketEmission(SocketEmitEnum.UpdateLang, { lang: 'ja' }),
    )
    await vi.waitFor(() => expect(peer.frames).toHaveLength(4))
    expect(
      peer.frames.filter((frame) => frame.event.startsWith('room.')),
    ).toEqual([join])

    connection.emit(leave)
    await vi.waitFor(() => expect(peer.frames).toHaveLength(5))
    expect(
      peer.frames.filter((frame) => frame.event.startsWith('room.')),
    ).toEqual([join, leave])
  })
})
