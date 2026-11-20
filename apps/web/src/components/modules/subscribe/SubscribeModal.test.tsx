import type { FormEvent, ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SubscribeModal } from './SubscribeModal'

const fixture = vi.hoisted(() => ({
  enable: true,
  selection: { post_c: true, note_c: false, say_c: true, recently_c: false },
  responseStatus: 204,
  dispatch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  onConfirm: vi.fn(),
  requests: [] as { path: string; method: string; body: unknown }[],
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
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useReducer: () => [
    { email: ' reader@example.com ', types: fixture.selection },
    fixture.dispatch,
  ],
  useState: () => [false, vi.fn()],
  useEffect: vi.fn(),
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('~/hooks/common/use-state-ref', () => ({
  useStateToRef: (current: unknown) => ({ current }),
}))
vi.mock('~/lib/push-worker', () => ({ registerPushWorker: vi.fn() }))
vi.mock('./hooks', () => ({
  useSubscribeStatusQuery: () => ({
    data: { enable: fixture.enable, allowTypes: ['post_c', 'note_c'] },
  }),
}))
vi.mock('~/components/ui/button', () => ({ StyledButton: 'button' }))
vi.mock('~/components/ui/checkbox', () => ({ Checkbox: 'input' }))
vi.mock('~/components/ui/input/Input', () => ({ Input: 'input' }))
vi.mock('~/lib/toast', () => ({
  toast: { success: fixture.success, error: fixture.error },
}))
vi.mock('~/providers/root/aggregation-data-provider', () => ({
  useAggregationSelector: () => 'Example',
  useAppConfigSelector: () => undefined,
}))

const submit = async () => {
  const element = SubscribeModal({
    onConfirm: fixture.onConfirm,
  }) as ReactElement<{
    onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  }>
  const preventDefault = vi.fn()
  await element.props.onSubmit({
    preventDefault,
  } as unknown as FormEvent<HTMLFormElement>)
  expect(preventDefault).toHaveBeenCalled()
}

describe('email subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fixture.enable = true
    fixture.selection.post_c = true
    fixture.responseStatus = 204
    fixture.requests = []
    vi.stubGlobal(
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init)
        fixture.requests.push({
          path: new URL(request.url).pathname,
          method: request.method,
          body: await request.json(),
        })
        return fixture.responseStatus === 204
          ? new Response(null, { status: 204 })
          : Response.json(
              { message: 'Too Many Requests' },
              { status: fixture.responseStatus },
            )
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('treats the Core 14/18 empty response as request receipt, not proof of an active subscription or of an email being sent', async () => {
    await submit()

    expect(fixture.requests).toEqual([
      {
        path: '/api/v3/subscribe',
        method: 'POST',
        body: { email: 'reader@example.com', types: ['post_c'] },
      },
    ])
    expect(fixture.success).toHaveBeenCalledWith('request_received')
    expect(fixture.onConfirm).toHaveBeenCalledOnce()
  })

  it('keeps the form open and reports request failure when Core rate-limits', async () => {
    fixture.responseStatus = 429
    await submit()

    expect(fixture.error).toHaveBeenCalledWith('request_failed')
    expect(fixture.success).not.toHaveBeenCalled()
    expect(fixture.dispatch).not.toHaveBeenCalled()
    expect(fixture.onConfirm).not.toHaveBeenCalled()
  })

  it('does not request subscription with only a hidden/unsupported type selected', async () => {
    fixture.selection.post_c = false
    await submit()
    expect(fixture.requests).toEqual([])
    expect(fixture.onConfirm).not.toHaveBeenCalled()
  })
})
