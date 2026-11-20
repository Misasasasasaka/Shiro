import {
  RecentlyAttitudeEnum,
  RecentlyAttitudeResultEnum,
} from '@mx-space/api-client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getRecentlyAttitudeCounts,
  submitRecentlyAttitude,
} from './recently-attitude'

vi.mock('~/lib/request', async () => {
  const { default: createClient, allControllers } =
    await import('@mx-space/api-client')
  const { createFetch } = await import('ofetch')
  const { createFetchAdapter } = await import('./fetch/shared')
  const fetch = createFetch({ fetch: (...args) => globalThis.fetch(...args) })
  return {
    apiClient: createClient(createFetchAdapter(fetch))(
      'https://core.example/api/v3',
      { controllers: allControllers },
    ),
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Core thinking attitudes', () => {
  it.each([RecentlyAttitudeEnum.Up, RecentlyAttitudeEnum.Down])(
    'submits attitude %d as a POST query parameter and unwraps the result',
    async (attitude) => {
      const fetch = vi.fn(async () =>
        Response.json({ data: { code: RecentlyAttitudeResultEnum.Inc } }),
      )
      vi.stubGlobal('fetch', fetch)

      await expect(
        submitRecentlyAttitude('9223372036854775807', attitude),
      ).resolves.toEqual({ code: RecentlyAttitudeResultEnum.Inc })
      expect(fetch).toHaveBeenCalledExactlyOnceWith(
        `https://core.example/api/v3/recently/attitude/9223372036854775807?attitude=${attitude}`,
        expect.objectContaining({ method: 'POST', body: undefined }),
      )
    },
  )

  it('does not retry or fall back to a state-changing GET after an error', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 503 }))
    vi.stubGlobal('fetch', fetch)

    await expect(
      submitRecentlyAttitude('123', RecentlyAttitudeEnum.Up),
    ).rejects.toMatchObject({ status: 503 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reads both counts from the Core detail endpoint with a cache bypass', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_747_000_000_000)
    const fetch = vi.fn(async () =>
      Response.json({ data: { id: '123', up: 7, down: 0 } }),
    )
    vi.stubGlobal('fetch', fetch)

    await expect(getRecentlyAttitudeCounts('123')).resolves.toEqual({
      up: 7,
      down: 0,
    })
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      'https://core.example/api/v3/recently/123?ts=1747000000000',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
