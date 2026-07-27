'use client'

import Cookies from 'js-cookie'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'

import type { Locale } from '~/i18n/config'
import { locales } from '~/i18n/config'
import {
  isLocalePreference,
  localeCookie,
  localeCookieClientOptions,
} from '~/i18n/locale-cookie'
import { usePathname, useRouter } from '~/i18n/navigation'

import { LanguageSelector } from '../../ui/language-selector'

export const LocaleSwitcher = () => {
  const t = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const localeLabels: Record<Locale, string> = useMemo(
    () => ({
      zh: t('locale_zh'),
      en: t('locale_en'),
      ja: t('locale_ja'),
    }),
    [t],
  )

  const languages = useMemo(
    () =>
      locales.map((l) => ({
        code: l,
        label: localeLabels[l],
      })),
    [localeLabels],
  )

  const handleLocaleChange = useCallback(
    (newLocale: string) => {
      if (!isLocalePreference(newLocale)) return

      Cookies.set(localeCookie.name, newLocale, localeCookieClientOptions)
      router.replace(pathname, { locale: newLocale })
    },
    [pathname, router],
  )

  return (
    <LanguageSelector
      languages={languages}
      currentLanguage={locale}
      onLanguageChange={handleLocaleChange}
    />
  )
}
