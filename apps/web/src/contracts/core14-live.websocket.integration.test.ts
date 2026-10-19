import { randomUUID } from 'node:crypto'

import { createWsClient, type WsClient } from '@mx-space/ws-client'
import { afterEach, describe, expect, it } from 'vitest'

import { buildGatewayUrl } from '~/socket/protocol'
import { EventTypes, SocketEmitEnum } from '~/types/events'

const gateway = process.env.CORE14_GATEWAY_URL
const liveDescribe = gateway ? describe.sequential : describe.skip
let client: WsClient | undefined

afterEach(() => {
  client?.close()
  client = undefined
})

const waitForEvent = (socket: WsClient, event: string) =>
  new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => {
      off()
      reject(new Error(`Core 14 ${event} timed out`))
    }, 15_000)
    const off = socket.on(event, (payload: unknown) => {
      clearTimeout(timer)
      off()
      resolve(payload)
    })
  })

liveDescribe('Core 14 live WebSocket integration', () => {
  it('reports online visitors and acknowledges room/session/language commands', async () => {
    const sessionId = `shiro-core14-test-${randomUUID()}`
    client = createWsClient({
      query: { lang: 'en', socket_session_id: sessionId },
      url: buildGatewayUrl(gateway!),
    })
    const [greeting, online] = await Promise.all([
      waitForEvent(client, 'gateway.connect'),
      waitForEvent(client, EventTypes.VISITOR_ONLINE),
    ])
    expect(greeting).toBe('WebSocket connected')
    expect(online).toMatchObject({ online: expect.any(Number) })
    expect(Reflect.get(online as object, 'online')).toBeGreaterThan(0)

    const room = 'article_9223372036854775807'
    for (const [event, payload] of [
      [SocketEmitEnum.Join, { room }],
      [SocketEmitEnum.UpdateSid, { sessionId: `${sessionId}-updated` }],
      [SocketEmitEnum.UpdateLang, { lang: 'zh-CN' }],
      [SocketEmitEnum.Leave, { room }],
    ] as const) {
      await expect(client.request(event, payload)).resolves.toMatchObject({
        ok: true,
      })
    }
  }, 60_000)
})
