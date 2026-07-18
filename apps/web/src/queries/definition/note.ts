import { apiClient } from '~/lib/request'
import type { NoteDetail } from '~/types/content'

import { defineQuery } from '../helper'

const LATEST_KEY = 'latest'
export const note = {
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
          return (await apiClient.note.getLatest()) as NoteDetail
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

        return data as NoteDetail
      },
    }),
}
