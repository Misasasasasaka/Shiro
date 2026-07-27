import { defineRouting } from 'next-intl/routing'

import { defaultLocale, locales } from './config'
import { localeCookie } from './locale-cookie'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeCookie,
})
