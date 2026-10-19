/// <reference lib="webworker" />

import { GatewayConnection } from './connection'
import type { SocketWorkerInput } from './protocol'

const workerScope = self as DedicatedWorkerGlobalScope
let connection: GatewayConnection | undefined

workerScope.onmessage = (event: MessageEvent<SocketWorkerInput>) => {
  const message = event.data

  switch (message.type) {
    case 'config': {
      connection ??= new GatewayConnection(message.payload, (output) =>
        workerScope.postMessage(output),
      )
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
      workerScope.postMessage({ type: 'ping' })
      if (connection?.connected) workerScope.postMessage({ type: 'connect' })
      break
    }
  }
}
