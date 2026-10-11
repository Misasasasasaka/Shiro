'use client'

import { useEffect } from 'react'

import { socketWorker } from '~/socket'
import { articleRoomName } from '~/socket/protocol'
import { SocketEmitEnum } from '~/types/events'

export const ArticleRoomSubscriber = ({ id }: { id: string }) => {
  useEffect(() => {
    const roomName = articleRoomName(id)
    socketWorker.emit(SocketEmitEnum.Join, { room: roomName })

    return () => {
      socketWorker.emit(SocketEmitEnum.Leave, { room: roomName })
    }
  }, [id])

  return null
}
