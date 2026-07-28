'use client'

import { useTranslations } from 'next-intl'

import { clsxm } from '~/lib/helper'

export const NoteLockIndicator = ({ className }: { className?: string }) => {
  const t = useTranslations('note')
  const label = t('password_required')

  return (
    <i
      aria-label={label}
      className={clsxm(
        'i-mingcute-lock-line inline-block shrink-0 text-neutral/60',
        className,
      )}
      role="img"
      title={label}
    />
  )
}
