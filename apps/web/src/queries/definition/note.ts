import type { NoteTimelineItem } from '@mx-space/api-client'

import { apiClient } from '~/lib/request'
import type { NoteDetail } from '~/types/content'

import { defineQuery } from '../helper'

const LATEST_KEY = 'latest'
export const note = {
  timeline: (id: string, lang?: string) =>
    defineQuery({
      queryKey: ['note_timeline', id, lang],
      queryFn: async () =>
        (
          await apiClient.note.proxy
            .list(id)
            .get<Array<NoteTimelineItem & { hasPassword?: boolean }>>({
              params: { size: 10, lang },
            })
        ).$serialized,
    }),
  byNid: (nid: string, password?: string | null, lang?: string) =>
    defineQuery({
      queryKey: ['note', nid, password ?? null, lang],

      queryFn: async ({ queryKey }) => {
        const [, value, , lang] = queryKey as [
          string,
          string,
          string | null,
          string | undefined,
        ]

        if (value === LATEST_KEY) {
          const data = await apiClient.note.getLatest()
          return { ...data.$serialized, $meta: data.$meta } as NoteDetail
        }
        const parsedNid = Number(value)
        if (!Number.isSafeInteger(parsedNid) || parsedNid < 1) {
          throw new Error(`Invalid note nid: ${value}`)
        }

        const data = await apiClient.note.getNoteByNid(parsedNid, {
          password: password || undefined,
          lang: lang || undefined,
          prefer: 'lexical',
        })

        return { ...data.$serialized, $meta: data.$meta } as NoteDetail
      },
    }),
}
