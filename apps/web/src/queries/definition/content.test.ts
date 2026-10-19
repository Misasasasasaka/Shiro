import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { contentMetaFor } from '~/types/content'

import { note } from './note'
import { post } from './post'

vi.mock('~/lib/request', async () => {
  const { default: createClient, allControllers } =
    await import('@mx-space/api-client')
  const { fetchAdaptor } =
    await import('@mx-space/api-client/dist/adaptors/fetch')
  return {
    apiClient: createClient(fetchAdaptor)('https://core.example/api/v3', {
      controllers: allControllers,
    }),
  }
})

const queryClient = new QueryClient()

afterEach(() => {
  queryClient.clear()
  vi.unstubAllGlobals()
})

describe('content query serialization', () => {
  it.each([
    ['post', () => queryClient.fetchQuery(post.bySlug('tech', 'hello', 'en'))],
    ['note', () => queryClient.fetchQuery(note.byNid('1', null, 'en'))],
    ['latest note', () => queryClient.fetchQuery(note.byNid('latest'))],
  ] as const)(
    'keeps %s interaction and translation metadata across the server boundary',
    async (_, load) => {
      const id = '9223372036854775807'
      const interaction = { isLiked: true, likeCount: 3, readCount: 13 }
      const translation = {
        article: { title: 'Translated title' },
        fields: ['title'],
      }
      const meta = {
        interaction: { [id]: interaction },
        translation: { [id]: translation },
      }
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          Response.json({ data: { id, nid: 1, title: 'Hello' }, meta }),
        ),
      )

      const result = await load()
      const serializedJson = JSON.stringify(result)
      const serialized = JSON.parse(serializedJson)

      expect(serialized).toMatchObject({ id, $meta: meta })
      expect(contentMetaFor(serialized)).toMatchObject({
        interaction,
        translation,
      })
      expect(Object.getOwnPropertyDescriptors(result)).not.toHaveProperty(
        '$request',
      )
      expect(Object.getOwnPropertyDescriptors(result)).not.toHaveProperty(
        '$serialized',
      )
    },
  )
})
