/// <reference lib="webworker" />

import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

import type { SocketWorkerInput, SocketWorkerOutput } from './protocol'

const workerScope = self as DedicatedWorkerGlobalScope
let socket: Socket | null = null
const waitingEmitQueue: Array<{ payload: unknown; type: string }> = []

const post = (message: SocketWorkerOutput) => workerScope.postMessage(message)

const setupIo = (config: {
  lang?: string
  socketSessionId: string
  url: string
}) => {
  if (socket) return

  socket = io(config.url, {
    autoConnect: false,
    reconnectionAttempts: 3,
    reconnectionDelay: 3000,
    timeout: 10000,
    transports: ['websocket'],
    query: {
      socket_session_id: config.socketSessionId,
      ...(config.lang ? { lang: config.lang } : {}),
    },
  })

  socket.on('disconnect', () => post({ type: 'disconnect' }))
  socket.on('message', (payload: unknown) => post({ payload, type: 'message' }))
  socket.on('connect', () => {
    const currentSocket = socket
    if (!currentSocket) return

    for (const payload of waitingEmitQueue.splice(0)) {
      currentSocket.emit('message', payload)
    }

    post({ payload: currentSocket.id, type: 'connect' })
    post({ payload: currentSocket.id, type: 'sid' })
  })
  socket.open()
}

workerScope.onmessage = (event: MessageEvent<SocketWorkerInput>) => {
  const message = event.data

  switch (message.type) {
    case 'config': {
      setupIo(message.payload)
      break
    }
    case 'emit': {
      if (socket?.connected) socket.emit('message', message.payload)
      else waitingEmitQueue.push(message.payload)
      break
    }
    case 'reconnect': {
      socket?.open()
      break
    }
    case 'init': {
      post({ type: 'ping' })
      if (socket?.connected) {
        post({ payload: socket.id, type: 'connect' })
      }
      if (socket?.id) post({ payload: socket.id, type: 'sid' })
      break
    }
  }
}
