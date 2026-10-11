/// <reference lib="webworker" />

import { GatewayConnection } from './connection'
import type { SocketWorkerInput, SocketWorkerOutput } from './protocol'

const workerScope = self as DedicatedWorkerGlobalScope
const post = (message: SocketWorkerOutput) => workerScope.postMessage(message)
let connection: GatewayConnection | undefined

workerScope.onmessage = (event: MessageEvent<SocketWorkerInput>) => {
  const message = event.data
  switch (message.type) {
    case 'config': {
      connection ??= new GatewayConnection(message.payload, post)
      break
    }
    case 'emit': {
      connection?.emit(message.payload)
      break
    }
    case 'reconnect': {
      connection?.reconnect()
      break
    }
    case 'init': {
      post({ type: 'ping' })
      break
    }
  }
}
