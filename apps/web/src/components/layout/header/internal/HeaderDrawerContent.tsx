'use client'

import { m } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { ComponentProps } from 'react'
import { memo, useCallback } from 'react'

import { DocumentLink } from '~/components/ui/link/DocumentLink'
import { useSheetContext } from '~/components/ui/sheet/context'
import { reboundPreset } from '~/constants/spring'

import type { IHeaderMenu } from '../config'
import { useHeaderConfig } from './HeaderDataConfigureProvider'

export const HeaderDrawerContent = () => {
  const { config } = useHeaderConfig()
  const t = useTranslations('common')

  const getTitle = useCallback(
    (item: IHeaderMenu) => {
      if (item.titleKey) {
        return t(item.titleKey as any)
      }
      return item.title
    },
    [t],
  )

  return (
    <div className="scrollbar-none mt-12 max-h-[80dvh] w-[90vw] space-y-4 overflow-auto pb-24">
      {config.map((section, index) => {
        let href = section.path
        if (section.search) {
          href += `?${new URLSearchParams(section.search).toString()}`
        }

        return (
          <m.section
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              ...reboundPreset,
              delay: index * 0.08,
            }}
            key={href}
          >
            <LinkInternal
              className="block"
              href={href}
              reloadDocument={section.reloadDocument}
            >
              <span className="flex items-center space-x-2 py-2 text-lg">
                <i>{section.icon}</i>
                <h2>{getTitle(section)}</h2>
              </span>
            </LinkInternal>

            {section.subMenu && (
              <ul className="my-2 grid grid-cols-2 gap-2">
                {section.subMenu.map((sub) => (
                  <li key={sub.path}>
                    <LinkInternal
                      className="inline-block p-2"
                      href={sub.path}
                      reloadDocument={sub.reloadDocument}
                    >
                      {getTitle(sub)}
                    </LinkInternal>
                  </li>
                ))}
              </ul>
            )}
          </m.section>
        )
      })}
    </div>
  )
}

const LinkInternal = memo(function LinkInternal({
  children,
  ...rest
}: ComponentProps<typeof DocumentLink>) {
  const { dismiss } = useSheetContext()
  return (
    <DocumentLink {...rest} onClick={dismiss}>
      {children}
    </DocumentLink>
  )
})
