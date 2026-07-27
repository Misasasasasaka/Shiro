import { describe, expect, it } from 'vitest'

import {
  isLocalePreference,
  localeCookie,
  localeCookieClientOptions,
} from './locale-cookie'

describe('locale preference cookie', () => {
  it('persists the locale at the site root for one year', () => {
    expect(localeCookie).toEqual({
      name: 'NEXT_LOCALE',
      maxAge: 31_536_000,
      path: '/',
      sameSite: 'lax',
    })
    expect(localeCookieClientOptions).toEqual({
      expires: 365,
      path: '/',
      sameSite: 'lax',
    })
    expect(isLocalePreference('zh')).toBe(true)
    expect(isLocalePreference('fr')).toBe(false)
  })
})
