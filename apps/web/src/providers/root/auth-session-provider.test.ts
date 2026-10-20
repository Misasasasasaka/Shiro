import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchAppUrl } from '~/atoms'
import { setIsOwnerLogged } from '~/atoms/hooks/owner'
import { setSessionReader } from '~/atoms/hooks/reader'

import { AuthSessionProvider } from './auth-session-provider'

const fixture = vi.hoisted(() => ({ session: undefined as unknown }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: fixture.session }),
}))
vi.mock('react', () => ({ useEffect: (effect: () => void) => effect() }))
vi.mock('~/atoms', () => ({ fetchAppUrl: vi.fn(async () => ({})) }))
vi.mock('~/atoms/hooks/owner', () => ({ setIsOwnerLogged: vi.fn() }))
vi.mock('~/atoms/hooks/reader', () => ({ setSessionReader: vi.fn() }))
vi.mock('~/lib/request', () => ({ apiClient: {} }))

beforeEach(() => {
  vi.clearAllMocks()
  fixture.session = undefined
})

describe('Core owner session state', () => {
  it('keeps the SSR owner state while the session request is pending', () => {
    AuthSessionProvider({ children: null })
    expect(setIsOwnerLogged).not.toHaveBeenCalled()
    expect(setSessionReader).not.toHaveBeenCalled()
  })

  it('clears owner controls when an authenticated session becomes a reader', () => {
    fixture.session = { id: 'owner', role: 'owner' }
    AuthSessionProvider({ children: null })
    expect(setIsOwnerLogged).toHaveBeenLastCalledWith(true)
    expect(fetchAppUrl).toHaveBeenCalledTimes(1)

    fixture.session = { id: 'reader', role: 'reader' }
    AuthSessionProvider({ children: null })
    expect(setIsOwnerLogged).toHaveBeenLastCalledWith(false)
    expect(setSessionReader).toHaveBeenLastCalledWith(fixture.session)
    expect(fetchAppUrl).toHaveBeenCalledTimes(1)
  })

  it('clears the reader and owner state after logout', () => {
    fixture.session = null
    AuthSessionProvider({ children: null })
    expect(setIsOwnerLogged).toHaveBeenCalledWith(false)
    expect(setSessionReader).toHaveBeenCalledWith(null)
  })
})
