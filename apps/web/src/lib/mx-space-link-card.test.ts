import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchMxSpaceLinkCard } from './mx-space-link-card'

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

afterEach(() => vi.unstubAllGlobals())

describe('Core 14 rich renderer link cards', () => {
  it.each([
    { id: 'posts/tech/hello', apiPath: '/api/v3/posts/tech/hello' },
    { id: 'notes/13', apiPath: '/api/v3/notes/nid/13' },
  ])('loads $id from the native envelope', async ({ id, apiPath }) => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: {
          id: '9223372036854775807',
          title: 'A Core 14 article',
          text: '# Body',
          summary: 'Card summary',
          meta: { cover: 'https://blog.example/cover.jpg' },
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchMxSpaceLinkCard(id)).resolves.toMatchObject({
      id: '9223372036854775807',
      title: 'A Core 14 article',
      summary: 'Card summary',
      meta: { cover: 'https://blog.example/cover.jpg' },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(apiPath),
      expect.any(Object),
    )
  })

  it('provides text for the renderer when optional text and summary are null', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({
        data: { title: 'Title only', text: null, summary: null },
      }),
    )
    await expect(
      fetchMxSpaceLinkCard('posts/tech/title-only'),
    ).resolves.toMatchObject({ title: 'Title only', text: '' })
  })

  it('propagates API errors instead of rendering an error envelope', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({ error: { message: 'Not found' } }, { status: 404 }),
    )
    await expect(fetchMxSpaceLinkCard('notes/13')).rejects.toMatchObject({
      status: 404,
    })
  })

  it.each([
    'notes/0',
    'notes/NaN',
    'notes/13oops',
    'notes/1/extra',
    'posts/tech',
  ])('rejects invalid article path %s without a request', async (path) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchMxSpaceLinkCard(path)).rejects.toThrow(
      'Invalid Mix Space link card path',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
