import { isWsEnvelope } from '@mx-space/ws-client/protocol'

import type { SocketEmitEnum } from '~/types/events'

export type SocketEmissionPayloads = {
  [SocketEmitEnum.Join]: { room: string }
  [SocketEmitEnum.Leave]: { room: string }
  [SocketEmitEnum.UpdateSid]: { sessionId: string }
  [SocketEmitEnum.UpdateLang]: { lang: string }
}

export type SocketEmission = {
  [T in SocketEmitEnum]: {
    event: T
    payload: SocketEmissionPayloads[T]
    v: 1
  }
}[SocketEmitEnum]

export const createSocketEmission = <T extends SocketEmitEnum>(
  event: T,
  payload: SocketEmissionPayloads[T],
): SocketEmission => ({ event, payload, v: 1 }) as SocketEmission

export type SocketWorkerConfig = {
  lang?: string
  socketSessionId: string
  url: string
}

export type SocketWorkerInput =
  | { payload: SocketWorkerConfig; type: 'config' }
  | { payload: SocketEmission; type: 'emit' }
  | { type: 'init' | 'reconnect' }

export type SocketWorkerOutput =
  | { type: 'connect' | 'disconnect' | 'ping' }
  | { payload: unknown; type: 'message' }

const property = (value: unknown, key: string): unknown => {
  if (typeof value !== 'object' || value === null) return undefined
  return Reflect.get(value, key)
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
  const type = property(value, 'type')
  return (
    type === 'connect' ||
    type === 'disconnect' ||
    type === 'message' ||
    type === 'ping'
  )
}

export const articleRoomName = (articleId: string) => `article_${articleId}`

export const buildGatewayUrl = (gateway: string, pageOrigin?: string) => {
  const url = new URL(gateway || pageOrigin || '', pageOrigin)
  switch (url.protocol) {
    case 'https:':
    case 'wss:': {
      url.protocol = 'wss:'
      break
    }
    case 'http:':
    case 'ws:': {
      url.protocol = 'ws:'
      break
    }
    default: {
      throw new Error('The Core gateway must use HTTP(S) or WS(S)')
    }
  }

  const path = url.pathname.replace(/\/+$/, '')
  url.pathname = path.endsWith('/ws/web') ? path : `${path}/ws/web`
  url.hash = ''
  return url.toString()
}
