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
  it('loads adjacent notes from a V3 array without a second data unwrap', async () => {
    const notes = [
      { id: '9223372036854775807', nid: 1, title: 'First' },
      { id: '9223372036854775806', nid: 2, title: 'Second' },
    ]
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ data: notes, meta: { view: 'card' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await queryClient.fetchQuery(
      note.timeline(notes[0].id, 'en'),
    )
    expect(result).toEqual(notes)
    const url = new URL(fetchMock.mock.calls[0]![0] as string)
    expect(url.pathname).toBe(`/api/v3/notes/list/${notes[0].id}`)
    expect(url.searchParams.get('lang')).toBe('en')
    expect(url.searchParams.get('size')).toBe('10')
  })

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
