import type { FormEvent, ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchOwnerAuth } from '~/app/[locale]/api'
import { adminUrlAtom, fetchAppUrl, webUrlAtom } from '~/atoms/url'
import { PostPinIcon } from '~/components/modules/post/PostPinIcon'
import { PostRelated } from '~/components/modules/post/PostRelated'
import { SayModalForm } from '~/components/modules/say/SayModalForm'
import { apiClient } from '~/lib/request'
import { jotaiStore } from '~/lib/store'
import { useAuthProviders } from '~/queries/hooks/authjs'
import type { PostDetail } from '~/types/content'

const fixture = vi.hoisted(() => ({
  query: undefined as { queryFn: () => Promise<unknown> } | undefined,
  response: {} as unknown,
  status: 200,
  requests: [] as { path: string; method: string; body: unknown }[],
  formRef: { current: { getCurrentValues: () => ({ text: 'edited' }) } },
  post: undefined as PostDetail | undefined,
}))

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
vi.mock('@tanstack/react-query', () => ({
  useQuery: (query: typeof fixture.query) => {
    fixture.query = query
    return {}
  },
}))
vi.mock('~/providers/root/react-query-provider', () => ({
  queryClient: {
    fetchQuery: (options: { queryFn: () => Promise<unknown> }) =>
      options.queryFn(),
    invalidateQueries: vi.fn(),
  },
}))
vi.mock('~/lib/query-client.server', () => ({ getQueryClient: vi.fn() }))
vi.mock('~/lib/attach-fetch', () => ({ attachServerFetch: vi.fn() }))
vi.mock('~/lib/store', () => ({ jotaiStore: { set: vi.fn() } }))
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: (value: unknown) => [value, vi.fn()],
  useRef: () => fixture.formRef,
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('~/lib/authjs', () => ({ authClient: {} }))
vi.mock('~/atoms/hooks/viewport', () => ({ useIsMobile: () => false }))
vi.mock('~/components/icons/platform/GitHubBrandIcon', () => ({
  GitHubBrandIcon: () => null,
}))
vi.mock('~/components/ui/button', () => ({
  StyledButton: 'button',
  MotionButtonBase: 'button',
}))
vi.mock('~/components/ui/modal', () => ({
  useModalStack: () => ({}),
  useCurrentModal: () => ({ dismiss: vi.fn() }),
}))
vi.mock('~/components/ui/form', () => ({ Form: 'form', FormInput: 'input' }))
vi.mock('~/components/ui/form/FormTextarea', () => ({
  FormTextarea: 'textarea',
}))
vi.mock('~/components/modules/shared/PinIconToggle', () => ({
  PinIconToggle: 'button',
}))
vi.mock('~/components/modules/say/hooks', () => ({ sayQueryKey: ['says'] }))
vi.mock('~/components/modules/peek/PeekLink', () => ({ PeekLink: 'a' }))
vi.mock('~/lib/toast', () => ({ toast: { success: vi.fn() } }))
vi.mock('~/providers/root/aggregation-data-provider', () => ({
  useAggregationSelector: vi.fn(),
}))
vi.mock('~/providers/post/CurrentPostDataProvider', () => ({
  useCurrentPostDataSelector: (
    selector: (post: typeof fixture.post) => unknown,
  ) => selector(fixture.post),
}))

const id = '9223372036854775807'

beforeEach(() => {
  vi.clearAllMocks()
  fixture.requests = []
  fixture.status = 200
  fixture.response = { data: { id } }
  vi.stubGlobal(
    'fetch',
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      fixture.requests.push({
        path: new URL(request.url).pathname,
        method: request.method,
        body: request.method === 'GET' ? null : await request.json(),
      })
      return Response.json(fixture.response, { status: fixture.status })
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Core 14 UI API contracts', () => {
  it.each([{ providers: ['github'] }, { providers: [] }])(
    'loads OAuth providers: $providers',
    async ({ providers }) => {
      fixture.response = { data: providers }
      useAuthProviders()
      await expect(fixture.query?.queryFn()).resolves.toEqual(providers)
      expect(fixture.requests[0]?.path).toBe('/api/v3/auth/providers')
    },
  )

  it('loads and stores owner URLs after the SDK unwraps the envelope', async () => {
    fixture.response = {
      data: {
        admin_url: 'https://core.example/admin',
        web_url: 'https://blog.example',
      },
    }
    await expect(fetchAppUrl()).resolves.toMatchObject({
      adminUrl: 'https://core.example/admin',
      webUrl: 'https://blog.example',
    })
    expect(jotaiStore.set).toHaveBeenCalledWith(
      adminUrlAtom,
      'https://core.example/admin',
    )
    expect(jotaiStore.set).toHaveBeenCalledWith(
      webUrlAtom,
      'https://blog.example',
    )
  })

  it.each([1, 0])('hydrates owner status from data.ok = %i', async (ok) => {
    fixture.response = { data: { ok, is_guest: !ok } }
    await expect(fetchOwnerAuth()).resolves.toBe(Boolean(ok))
    expect(fixture.requests[0]?.path).toBe('/api/v3/owner/check_logged')
  })

  it('treats a failed owner check as unauthenticated', async () => {
    fixture.status = 401
    fixture.response = { error: { message: 'Not logged in' } }
    await expect(fetchOwnerAuth()).resolves.toBe(false)
  })

  it.each([true, false])(
    'persists post pin state %s with pinAt',
    async (pin) => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-19T04:00:00.000Z'))
      const element = PostPinIcon({ id, pin: !pin })
      await element.props.onPinChange(pin)
      expect(fixture.requests[0]).toEqual({
        path: `/api/v3/posts/${id}`,
        method: 'PATCH',
        body: { pinAt: pin ? '2026-10-19T04:00:00.000Z' : null },
      })
    },
  )

  it.each([true, false])('saves says with editing = %s', async (editing) => {
    const model = await apiClient.say.getById(id)
    fixture.requests = []
    const element = SayModalForm({
      editingData: editing ? model : undefined,
    }) as ReactElement<{
      onSubmit: (
        event: Pick<FormEvent<HTMLFormElement>, 'preventDefault'>,
      ) => Promise<void>
    }>
    await element.props.onSubmit({ preventDefault: vi.fn() })
    expect(fixture.requests[0]).toEqual({
      path: editing ? `/api/v3/says/${id}` : '/api/v3/says',
      method: editing ? 'PUT' : 'POST',
      body: { text: 'edited' },
    })
  })

  it.each([true, false])(
    'renders related metadata with category supplied = %s',
    async (withCategory) => {
      fixture.response = {
        data: { id, title: 'Post' },
        meta: {
          related: [
            {
              id: '9223372036854775806',
              title: 'Related article',
              slug: 'related',
              ...(withCategory ? { category: { slug: 'tech' } } : {}),
            },
          ],
        },
      }
      const response = await apiClient.post.getPost('tech', 'post')
      fixture.post = { ...response.$serialized, $meta: response.$meta }
      const html = renderToStaticMarkup(await PostRelated({}))
      expect(html).toContain('Related article')
      expect(html).toContain(
        `href="${withCategory ? '/posts/tech/related' : '/posts/related'}"`,
      )
    },
  )

  it('honors an empty related metadata list over legacy entity fields', async () => {
    fixture.response = {
      data: { id, related: [{ id: '1', title: 'Stale', slug: 'stale' }] },
      meta: { related: [] },
    }
    const response = await apiClient.post.getPost('tech', 'post')
    fixture.post = { ...response.$serialized, $meta: response.$meta }
    expect(PostRelated({})).toBeNull()
  })
})
