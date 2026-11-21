// @vitest-environment happy-dom

import {
  RecentlyAttitudeEnum,
  RecentlyAttitudeResultEnum,
} from '@mx-space/api-client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThinkingAttitudeButtons } from './ThinkingAttitudeButtons'

const fixture = vi.hoisted(() => ({
  submit: vi.fn(),
  counts: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), warn: vi.fn() },
}))

vi.mock('~/lib/recently-attitude', () => ({
  submitRecentlyAttitude: fixture.submit,
  getRecentlyAttitudeCounts: fixture.counts,
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('~/lib/toast', () => ({ toast: fixture.toast }))

const item = { id: '123', up: 3, down: 2 }
const flushNotifications = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('ThinkingAttitudeButtons', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    queryClient.clear()
    container.remove()
    vi.unstubAllGlobals()
  })

  const render = (copies = 1) =>
    act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ThinkingAttitudeButtons item={item} />
          {copies === 2 && <ThinkingAttitudeButtons item={item} />}
        </QueryClientProvider>,
      )
    })
  const buttons = () => [...container.querySelectorAll('button')]
  const waitForMutation = () =>
    vi.waitFor(() => expect(queryClient.isMutating()).toBe(0))

  it('blocks overlapping reactions across views and refreshes both counts', async () => {
    const vote = Promise.withResolvers<{ code: RecentlyAttitudeResultEnum }>()
    const counts = Promise.withResolvers<{ up: number; down: number }>()
    fixture.submit.mockReturnValueOnce(vote.promise)
    fixture.counts.mockReturnValueOnce(counts.promise)
    await render(2)
    expect(fixture.counts).not.toHaveBeenCalled()

    await act(async () => {
      buttons()[0]!.click()
      buttons()[3]!.click()
      await flushNotifications()
    })
    expect(fixture.submit).toHaveBeenCalledExactlyOnceWith(
      item.id,
      RecentlyAttitudeEnum.Up,
    )
    expect(buttons().every((button) => button.disabled)).toBe(true)

    await act(async () => {
      vote.resolve({ code: RecentlyAttitudeResultEnum.Inc })
      await vi.waitFor(() =>
        expect(fixture.counts).toHaveBeenCalledExactlyOnceWith(item.id),
      )
    })
    expect(buttons().every((button) => button.disabled)).toBe(true)

    await act(async () => {
      counts.resolve({ up: 4, down: 1 })
      await waitForMutation()
      await flushNotifications()
    })
    expect(
      buttons().map((button) => button.lastElementChild?.textContent),
    ).toEqual(['4', '1', '4', '1'])
    expect(buttons().every((button) => !button.disabled)).toBe(true)

    fixture.submit.mockResolvedValueOnce({
      code: RecentlyAttitudeResultEnum.Dec,
    })
    fixture.counts.mockResolvedValueOnce({ up: 3, down: 1 })
    await act(async () => {
      buttons()[0]!.click()
      await waitForMutation()
      await flushNotifications()
    })
    expect(fixture.counts).toHaveBeenCalledTimes(2)
    expect(buttons()[0]?.lastElementChild?.textContent).toBe('3')
  })

  it('reports a failed write and enables the buttons again', async () => {
    fixture.submit.mockRejectedValueOnce(new Error('Network error'))
    await render()
    await act(async () => {
      buttons()[0]!.click()
      await waitForMutation()
      await flushNotifications()
    })
    expect(fixture.toast.error).toHaveBeenCalledWith('attitude_failed')
    expect(fixture.counts).not.toHaveBeenCalled()
    expect(fixture.submit).toHaveBeenCalledTimes(1)
    expect(buttons().every((button) => !button.disabled)).toBe(true)
  })

  it('keeps the existing counts and reports a read failure after a saved vote', async () => {
    fixture.submit.mockResolvedValueOnce({
      code: RecentlyAttitudeResultEnum.Inc,
    })
    fixture.counts.mockRejectedValueOnce(new Error('Network error'))
    await render()
    await act(async () => {
      buttons()[1]!.click()
      await waitForMutation()
      await flushNotifications()
    })
    expect(fixture.toast.warn).toHaveBeenCalledWith(
      'attitude_count_refresh_failed',
    )
    expect(fixture.toast.error).not.toHaveBeenCalled()
    expect(buttons()[1]?.lastElementChild?.textContent).toBe('2')
    expect(buttons().every((button) => !button.disabled)).toBe(true)
  })
})
