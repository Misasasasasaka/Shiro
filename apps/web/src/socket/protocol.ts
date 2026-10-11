import { buildEnvelope, isWsEnvelope } from '@mx-space/ws-client/protocol'

import type { SocketEmitEnum } from '~/types/events'

export const createSocketEmission = (event: SocketEmitEnum, payload: unknown) =>
  buildEnvelope(event, payload)

export type SocketEmission = ReturnType<typeof createSocketEmission>
export type GatewayConfig = {
  lang?: string
  socketSessionId: string
  url: string
}

export type SocketWorkerInput =
  | { payload: GatewayConfig; type: 'config' }
  | { payload: SocketEmission; type: 'emit' }
  | { type: 'init' | 'reconnect' }

export type SocketWorkerOutput =
  | { type: 'connect' | 'disconnect' | 'ping' }
  | { payload: unknown; type: 'message' }

export const gatewayWebSocketUrl = (origin: string) => {
  const url = new URL(origin)
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
    throw new Error('Unsupported gateway URL protocol')
  }
  url.protocol = ['https:', 'wss:'].includes(url.protocol) ? 'wss:' : 'ws:'
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/ws/web`
  url.hash = ''
  return url.toString()
}

export const parseGatewayEvent = (
  payload: unknown,
): { data: unknown; type: string } | null => {
  let value = payload
  if (typeof payload === 'string') {
    try {
      value = JSON.parse(payload)
    } catch {
      return null
    }
  }
  if (!isWsEnvelope(value)) return null
  return { data: value.payload, type: value.event }
}

export const isSocketWorkerOutput = (
  value: unknown,
): value is SocketWorkerOutput => {
  if (typeof value !== 'object' || value === null) return false
  const type = Reflect.get(value, 'type')
  return ['connect', 'disconnect', 'message', 'ping'].includes(type)
}

export const articleRoomName = (articleId: string) => `article_${articleId}`
