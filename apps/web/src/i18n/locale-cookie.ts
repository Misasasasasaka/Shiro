import { type Locale, locales } from './config'

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365
const ONE_YEAR_IN_DAYS = 365

export const localeCookie = {
  name: 'NEXT_LOCALE',
  maxAge: ONE_YEAR_IN_SECONDS,
  path: '/',
  sameSite: 'lax',
} as const

export const localeCookieClientOptions = {
  expires: ONE_YEAR_IN_DAYS,
  path: localeCookie.path,
  sameSite: localeCookie.sameSite,
} as const satisfies {
  expires: number
  path: string
  sameSite: 'lax'
}

export const isLocalePreference = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value)
