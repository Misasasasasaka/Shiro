import { randomUUID } from 'node:crypto'

import { createWsClient, type WsClient } from '@mx-space/ws-client'
import { afterEach, describe, expect, it } from 'vitest'

import { gatewayWebSocketUrl } from '~/socket/protocol'
import { EventTypes, SocketEmitEnum } from '~/types/events'

const gateway = process.env.CORE14_GATEWAY_URL
const liveDescribe = gateway ? describe.sequential : describe.skip
let client: WsClient | undefined

afterEach(() => {
  client?.close()
  client = undefined
})

const nextEvent = (socket: WsClient, event: string) =>
  new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe()
      reject(new Error(`Core 14 ${event} timed out`))
    }, 15_000)
    const unsubscribe = socket.on(event, (payload: unknown) => {
      clearTimeout(timer)
      unsubscribe()
      resolve(payload)
    })
  })

liveDescribe('Core 14 live WebSocket integration', () => {
  it('receives events and acknowledges room/session/language commands', async () => {
    const sessionId = `shiro-core14-test-${randomUUID()}`
    client = createWsClient({
      url: gatewayWebSocketUrl(gateway!),
      query: { lang: 'en', socket_session_id: sessionId },
    })
    const onlineEvent = nextEvent(client, EventTypes.VISITOR_ONLINE)
    await nextEvent(client, 'gateway.connect')
    expect(client.state).toBe('open')
    expect(await onlineEvent).toMatchObject({ online: expect.any(Number) })

    const room = 'article_9223372036854775807'
    for (const [event, payload] of [
      [SocketEmitEnum.Join, { room }],
      [SocketEmitEnum.UpdateSid, { sessionId: `${sessionId}-updated` }],
      [SocketEmitEnum.UpdateLang, { lang: 'zh-CN' }],
      [SocketEmitEnum.Leave, { room }],
      ['ping', undefined],
    ] as const) {
      expect(await client.request(event, payload)).toEqual({ ok: true })
    }
  }, 30_000)
})
