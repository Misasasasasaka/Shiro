import { createWsClient, type WsClient } from '@mx-space/ws-client'
import { buildEnvelope } from '@mx-space/ws-client/protocol'

import { EventTypes, SocketEmitEnum } from '~/types/events'

import {
  type GatewayConfig,
  gatewayWebSocketUrl,
  type SocketEmission,
  type SocketWorkerOutput,
} from './protocol'

/** Keep subscription intent across disconnects, including navigation offline. */
export class GatewayConnection {
  private client?: WsClient
  private ready = false
  private rooms = new Set<string>()

  constructor(
    private config: GatewayConfig,
    private post: (message: SocketWorkerOutput) => void,
    private createClient: typeof createWsClient = createWsClient,
  ) {
    this.connect()
  }

  private connect() {
    const client = this.createClient({
      url: gatewayWebSocketUrl(this.config.url),
      query: {
        socket_session_id: this.config.socketSessionId,
        ...(this.config.lang ? { lang: this.config.lang } : {}),
      },
    })
    this.client = client
    client.on('$state', (state) => {
      if (state === 'open') return
      this.ready = false
      this.post({ type: 'disconnect' })
    })
    // Core initializes the session asynchronously after the upgrade handshake.
    client.on('gateway.connect', () => {
      this.ready = true
      client.send(SocketEmitEnum.UpdateSid, {
        sessionId: this.config.socketSessionId,
      })
      if (this.config.lang) {
        client.send(SocketEmitEnum.UpdateLang, { lang: this.config.lang })
      }
      for (const room of this.rooms) client.send(SocketEmitEnum.Join, { room })
      this.post({ type: 'connect' })
    })
    for (const event of Object.values(EventTypes)) {
      client.on(event, (payload: unknown) => {
        this.post({ payload: buildEnvelope(event, payload), type: 'message' })
      })
    }
  }

  emit({ event, payload }: SocketEmission) {
    if (typeof payload !== 'object' || payload === null) return
    const room = Reflect.get(payload, 'room')
    const sessionId = Reflect.get(payload, 'sessionId')
    const lang = Reflect.get(payload, 'lang')
    if (event === SocketEmitEnum.Join && typeof room === 'string') {
      this.rooms.add(room)
    } else if (event === SocketEmitEnum.Leave && typeof room === 'string') {
      this.rooms.delete(room)
    } else if (
      event === SocketEmitEnum.UpdateSid &&
      typeof sessionId === 'string'
    ) {
      this.config.socketSessionId = sessionId
    } else if (
      event === SocketEmitEnum.UpdateLang &&
      typeof lang === 'string'
    ) {
      this.config.lang = lang
    }
    if (this.ready) this.client?.send(event, payload)
  }

  reconnect() {
    // The official client owns heartbeat, backoff and automatic reconnects.
    if (!this.client || this.client.state === 'closed') this.connect()
  }

  close() {
    this.ready = false
    this.client?.close()
  }
}
