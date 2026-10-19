import { createWsClient, type WsClient } from '@mx-space/ws-client'
import { buildEnvelope } from '@mx-space/ws-client/protocol'

import { EventTypes, SocketEmitEnum } from '~/types/events'

import type {
  SocketEmission,
  SocketWorkerConfig,
  SocketWorkerOutput,
} from './protocol'

export class GatewayConnection {
  private client!: WsClient
  private ready = false
  private rooms = new Map<string, number>()

  constructor(
    private config: SocketWorkerConfig,
    private post: (message: SocketWorkerOutput) => void,
  ) {
    this.connect()
  }

  get connected() {
    return this.ready
  }

  private connect() {
    const client = createWsClient({
      url: this.config.url,
      query: {
        socket_session_id: this.config.socketSessionId,
        ...(this.config.lang ? { lang: this.config.lang } : {}),
      },
    })
    this.client = client

    client.on('$state', (state) => {
      if (client !== this.client || state === 'open') return
      const wasReady = this.ready
      this.ready = false
      if (wasReady) this.post({ type: 'disconnect' })
    })

    // The HTTP upgrade completes before Core finishes initializing metadata.
    // Wait for its greeting before sending commands or restoring subscriptions.
    client.on('gateway.connect', () => {
      if (client !== this.client || this.ready) return
      this.ready = true
      client.send(SocketEmitEnum.UpdateSid, {
        sessionId: this.config.socketSessionId,
      })
      if (this.config.lang) {
        client.send(SocketEmitEnum.UpdateLang, { lang: this.config.lang })
      }
      for (const room of this.rooms.keys()) {
        client.send(SocketEmitEnum.Join, { room })
      }
      this.post({ type: 'connect' })
    })

    for (const event of Object.values(EventTypes)) {
      client.on(event, (payload: unknown) => {
        if (client !== this.client) return
        this.post({ payload: buildEnvelope(event, payload), type: 'message' })
      })
    }
  }

  emit(message: SocketEmission) {
    switch (message.event) {
      case SocketEmitEnum.Join: {
        const { room } = message.payload
        const count = this.rooms.get(room) ?? 0
        this.rooms.set(room, count + 1)
        if (count > 0) return
        break
      }
      case SocketEmitEnum.Leave: {
        const { room } = message.payload
        const count = this.rooms.get(room) ?? 0
        if (count > 1) this.rooms.set(room, count - 1)
        else this.rooms.delete(room)
        if (count !== 1) return
        break
      }
      case SocketEmitEnum.UpdateSid: {
        this.config.socketSessionId = message.payload.sessionId
        break
      }
      case SocketEmitEnum.UpdateLang: {
        this.config.lang = message.payload.lang
        break
      }
    }

    if (this.ready) this.client.send(message.event, message.payload)
  }

  reconnect() {
    if (
      this.client.state !== 'reconnecting' &&
      this.client.state !== 'closed'
    ) {
      return
    }
    this.client.close()
    this.connect()
  }

  close() {
    this.client.close()
  }
}
