import { simpleCamelcaseKeys as camelcaseKeys } from '@mx-space/api-client'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

import { getSocketWebSessionId } from '~/atoms/hooks/socket'
import { setSocketIsConnect } from '~/atoms/socket'
import { GATEWAY_URL } from '~/constants/env'
import { SocketConnectedEvent, SocketDisconnectedEvent } from '~/events'
import { isDev, isServerSide } from '~/lib/env'
import type { SocketEmitEnum } from '~/types/events'

import { eventHandler } from './handler'
import {
  createSocketEmission,
  isSocketWorkerOutput,
  parseGatewayEvent,
  type SocketWorkerInput,
} from './protocol'

class SocketWorker {
  private router?: AppRouterInstance
  private sid?: string
  private worker: Worker | null = null

  constructor() {
    if (isServerSide) return

    const worker = new Worker(new URL('io.worker.ts', import.meta.url), {
      name: 'shiro-socket-worker',
      type: 'module',
    })
    this.prepare(worker)
    this.worker = worker
  }

  async getSid() {
    return this.sid
  }

  setRouter(router: AppRouterInstance) {
    this.router = router
  }

  private bindMessageHandler(worker: Worker) {
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (!isSocketWorkerOutput(event.data)) return
      const message = event.data

      switch (message.type) {
        case 'ping': {
          break
        }
        case 'connect': {
          window.dispatchEvent(new SocketConnectedEvent())
          setSocketIsConnect(true)
          if (typeof message.payload === 'string') this.sid = message.payload
          break
        }
        case 'disconnect': {
          window.dispatchEvent(new SocketDisconnectedEvent())
          setSocketIsConnect(false)
          break
        }
        case 'sid': {
          if (typeof message.payload === 'string') this.sid = message.payload
          break
        }
        case 'message': {
          const gatewayEvent = parseGatewayEvent(message.payload)
          if (!gatewayEvent) return
          this.handleEvent(
            gatewayEvent.type,
            camelcaseKeys<unknown>(gatewayEvent.data),
          )
          break
        }
      }
    }
  }

  private postMessage(message: SocketWorkerInput) {
    this.worker?.postMessage(message)
  }

  private prepare(worker: Worker, lang?: string) {
    const gatewayUrlWithoutTrailingSlash = GATEWAY_URL.replace(/\/$/, '')
    this.bindMessageHandler(worker)
    worker.postMessage({
      payload: {
        lang,
        socketSessionId: getSocketWebSessionId(),
        url: `${gatewayUrlWithoutTrailingSlash}/web`,
      },
      type: 'config',
    } satisfies SocketWorkerInput)
    worker.postMessage({ type: 'init' } satisfies SocketWorkerInput)
  }

  private handleEvent(type: string, data: unknown) {
    if (isDev) console.info(data)
    window.dispatchEvent(new CustomEvent(type, { detail: data }))
    eventHandler(type, data, this.router)
  }

  emit(event: SocketEmitEnum, payload: unknown) {
    this.postMessage({
      payload: createSocketEmission(event, payload),
      type: 'emit',
    })
  }

  reconnect() {
    this.postMessage({ type: 'reconnect' })
  }

  static shared = new SocketWorker()
}

export const socketWorker = SocketWorker.shared
export type TSocketClient = SocketWorker
