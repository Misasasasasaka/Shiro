import type { SocketEmitEnum } from '~/types/events'

export type SocketEmission = {
  payload: unknown
  type: SocketEmitEnum
}

export const createSocketEmission = (
  type: SocketEmitEnum,
  payload: unknown,
): SocketEmission => ({ payload, type })

export type SocketWorkerInput =
  | {
      payload: { lang?: string; socketSessionId: string; url: string }
      type: 'config'
    }
  | { payload: SocketEmission; type: 'emit' }
  | { type: 'init' | 'reconnect' }

export type SocketWorkerOutput =
  | { payload?: string; type: 'connect' | 'sid' }
  | { type: 'disconnect' | 'ping' }
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

  const type = property(value, 'type')
  if (typeof type !== 'string') return null
  return { data: property(value, 'data'), type }
}

export const isSocketWorkerOutput = (
  value: unknown,
): value is SocketWorkerOutput => {
  const type = property(value, 'type')
  return (
    type === 'connect' ||
    type === 'disconnect' ||
    type === 'message' ||
    type === 'ping' ||
    type === 'sid'
  )
}

export const articleRoomName = (articleId: string) => `article_${articleId}`
