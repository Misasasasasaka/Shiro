import { randomUUID } from 'node:crypto'

import { io, type Socket } from 'socket.io-client'
import { afterEach, describe, expect, it } from 'vitest'

import { parseGatewayEvent } from '~/socket/protocol'
import { EventTypes, SocketEmitEnum } from '~/types/events'

const configuredGateway = process.env.CORE13_GATEWAY_URL
const gatewayOrigin = configuredGateway
  ? configuredGateway.replace(/\/+$/, '')
  : undefined
const liveDescribe = gatewayOrigin ? describe.sequential : describe.skip

let socket: Socket | undefined

afterEach(() => {
  socket?.disconnect()
  socket = undefined
})

const waitForConnect = (client: Socket) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Core 13 WebSocket connection timed out')),
      15_000,
    )
    client.once('connect', () => {
      clearTimeout(timer)
      resolve()
    })
    client.once('connect_error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })

const waitForOnlineEvent = (client: Socket) =>
  new Promise<{ online: number }>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Core 13 online event timed out')),
      15_000,
    )
    client.on('message', (message: unknown) => {
      const event = parseGatewayEvent(message)
      if (event?.type !== EventTypes.VISITOR_ONLINE) return
      if (typeof event.data !== 'object' || event.data === null) return
      const online = Reflect.get(event.data, 'online')
      if (typeof online !== 'number') return
      clearTimeout(timer)
      resolve({ online })
    })
  })

liveDescribe('Core 13 live WebSocket integration', () => {
  it('connects, reports online users, and accepts room/session/lang events', async () => {
    const sessionId = `shiro-core13-test-${randomUUID()}`
    socket = io(`${gatewayOrigin}/web`, {
      autoConnect: false,
      query: { lang: 'en', socket_session_id: sessionId },
      timeout: 15_000,
      transports: ['websocket'],
    })
    const onlineEvent = waitForOnlineEvent(socket)
    const connected = waitForConnect(socket)
    socket.connect()

    await connected
    expect(socket.connected).toBe(true)
    expect(socket.id).toEqual(expect.any(String))

    const online = await onlineEvent
    expect(online.online).toBeGreaterThan(0)

    const roomName = 'article_9223372036854775807'
    socket.emit('message', {
      payload: { roomName },
      type: SocketEmitEnum.Join,
    })
    socket.emit('message', {
      payload: { sessionId: `${sessionId}-updated` },
      type: SocketEmitEnum.UpdateSid,
    })
    socket.emit('message', {
      payload: { lang: 'zh-CN' },
      type: SocketEmitEnum.UpdateLang,
    })
    socket.emit('message', {
      payload: { roomName },
      type: SocketEmitEnum.Leave,
    })

    expect(socket.connected).toBe(true)
  }, 30_000)
})
