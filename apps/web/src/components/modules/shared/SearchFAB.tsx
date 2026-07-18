'use client'

import type { PaginateResult } from '@mx-space/api-client'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { AnimatePresence, m } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import type { KeyboardEventHandler } from 'react'
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { EmptyIcon } from '~/components/icons/empty'
import { MotionButtonBase } from '~/components/ui/button'
import { FABPortable } from '~/components/ui/fab'
import { FloatPopover } from '~/components/ui/float-popover'
import { microDampingPreset } from '~/constants/spring'
import useDebounceValue from '~/hooks/common/use-debounce-value'
import { useIsClient } from '~/hooks/common/use-is-client'
import { Link } from '~/i18n/navigation'
import { apiClient } from '~/lib/request'
import {
  type Core13SearchResult,
  normalizeCore13SearchPage,
} from '~/lib/search'
import { jotaiStore } from '~/lib/store'

const searchPanelOpenAtom = atom(false)
const isComposingAtom = atom(false)
const currentSelectAtom = atom(0)

export const SearchFAB = () => {
  const isClient = useIsClient()
  if (!isClient) return null

  return (
    <FABPortable onClick={() => jotaiStore.set(searchPanelOpenAtom, true)}>
      <i className="i-mingcute-search-line" />
    </FABPortable>
  )
}

export const SearchPanelWithHotKey = () => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        jotaiStore.set(searchPanelOpenAtom, true)
      }

      if (
        event.key === 'Escape' &&
        jotaiStore.get(searchPanelOpenAtom) &&
        !jotaiStore.get(isComposingAtom)
      ) {
        event.preventDefault()
        jotaiStore.set(searchPanelOpenAtom, false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return <SearchPanel />
}

const SearchPanel = () => {
  const panelOpen = useAtomValue(searchPanelOpenAtom)

  return (
    <Dialog.Root open>
      {panelOpen && <Dialog.Overlay />}
      <Dialog.DialogTitle className="hidden">Search</Dialog.DialogTitle>
      <AnimatePresence>
        {panelOpen && (
          <Dialog.Portal>
            <Dialog.Content>
              <div className="center fixed inset-0 z-20 flex">
                <div
                  className="fixed inset-0 z-[-1]"
                  onClick={() => jotaiStore.set(searchPanelOpenAtom, false)}
                  tabIndex={-1}
                />
                <SearchPanelImpl />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

interface SearchListItem {
  title: string
  subtitle: string
  url: string
  id: string
}

const SearchPanelImpl = () => {
  const t = useTranslations('common')
  const locale = useLocale()
  const [keyword, setKeyword] = useState('')
  const listRef = useRef<HTMLUListElement>(null)
  const currentSelect = useAtomValue(currentSelectAtom)
  const setCurrentSelect = useSetAtom(currentSelectAtom)
  const debouncedKeyword = useDebounceValue(keyword, 360)

  const { data = [], isLoading } = useQuery({
    queryKey: ['search', debouncedKeyword, locale],
    enabled: debouncedKeyword.length > 0,
    queryFn: async () =>
      normalizeCore13SearchPage<Core13SearchResult>(
        await apiClient.search.searchAll(debouncedKeyword, { lang: locale }),
      ),
    select: useCallback(
      (page: PaginateResult<Core13SearchResult>): SearchListItem[] =>
        page.data.map((item) => {
          let subtitle = ''
          let url = '/'

          switch (item.type) {
            case 'post': {
              subtitle = item.category.name
              url = `/posts/${item.category.slug}/${item.slug}`
              break
            }
            case 'note': {
              subtitle = t('search_note')
              url = `/notes/${item.nid}`
              break
            }
            case 'page': {
              subtitle = t('search_page')
              url = `/${item.slug}`
              break
            }
          }

          return {
            title: item.title,
            subtitle: item.isFallback
              ? `${subtitle} · ${t('search_fallback')}`
              : subtitle,
            id: item.id,
            url,
          }
        }),
      [t],
    ),
  })

  useEffect(() => {
    setCurrentSelect(0)
  }, [debouncedKeyword, setCurrentSelect])

  useEffect(() => {
    listRef.current?.children.item(currentSelect)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [currentSelect])

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (data.length === 0) return

      switch (event.key) {
        case 'Enter': {
          const link = listRef.current?.children
            .item(currentSelect)
            ?.querySelector<HTMLAnchorElement>('a')
          link?.click()
          break
        }
        case 'ArrowDown': {
          setCurrentSelect((selected) => (selected + 1) % data.length)
          break
        }
        case 'ArrowUp': {
          setCurrentSelect((selected) =>
            selected <= 0 ? data.length - 1 : selected - 1,
          )
          break
        }
      }
    },
    [currentSelect, data.length, setCurrentSelect],
  )

  const isLogged = useIsOwnerLogged()

  return (
    <m.div
      className={clsx(
        'h-[600px] max-h-[80vh] w-[800px] max-w-screen rounded-none md:h-screen md:max-h-[60vh] md:max-w-[80vw]',
        'flex min-h-[50px] flex-col bg-zinc-50/80 shadow-2xl backdrop-blur-md dark:bg-neutral-900/80 md:rounded-xl',
        'border-0 border-zinc-200 dark:border-zinc-800 md:border',
      )}
      onKeyDown={handleKeyDown}
      role="dialog"
      initial
      exit={{ y: 20, opacity: 0 }}
      animate={{ y: 0, transition: microDampingPreset }}
    >
      <input
        autoFocus
        className="w-full shrink-0 border-b border-zinc-200 bg-transparent p-4 px-5 text-lg leading-4 dark:border-neutral-700"
        placeholder={t('search_placeholder')}
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        onCompositionStart={() => jotaiStore.set(isComposingAtom, true)}
        onCompositionEnd={() => jotaiStore.set(isComposingAtom, false)}
        onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
            event.preventDefault()
          }
        }}
      />

      <div className="relative h-0 shrink grow overflow-auto">
        <ul className="h-full px-2 py-4" ref={listRef}>
          {data.length > 0 ? (
            data.map((item, index) => (
              <SearchItem key={item.id} {...item} index={index} />
            ))
          ) : isLoading ? (
            <div className="center flex h-full grow">
              <div className="loading loading-spinner" />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                {keyword ? (
                  <EmptyIcon />
                ) : (
                  <i className="i-mingcute-search-line text-[60px]" />
                )}
                <span>{keyword && t('search_empty')}</span>
              </div>
            </div>
          )}
        </ul>
      </div>

      <div className="flex shrink-0 items-center justify-between px-4 py-2">
        {isLogged ? (
          <MotionButtonBase
            onClick={() => {
              toast.promise(apiClient.search.rebuild(), {
                loading: t('search_rebuilding'),
                success: t('search_rebuild_success'),
                error: t('search_rebuild_failed'),
              })
            }}
          >
            <FloatPopover
              mobileAsSheet
              type="tooltip"
              triggerElement={<i className="i-mingcute-refresh-2-line" />}
            >
              {t('search_rebuild')}
            </FloatPopover>
          </MotionButtonBase>
        ) : (
          <div />
        )}
        <span className="text-sm text-zinc-500">{t('search_local')}</span>
      </div>
    </m.div>
  )
}

const SearchItem = memo(function SearchItem({
  index,
  ...item
}: SearchListItem & { index: number }) {
  const selectIndex = useAtomValue(currentSelectAtom)
  const isSelected = selectIndex === index

  return (
    <li
      className={clsx(
        'relative flex w-full justify-between px-1',
        'before:content-auto before:absolute before:inset-0 before:rounded-md',
        'before:z-0 hover:before:bg-zinc-200/80 dark:hover:before:bg-zinc-800/80',
        isSelected && 'before:bg-zinc-200/80 dark:before:bg-zinc-800/80',
      )}
      onMouseOver={() => {
        startTransition(() => jotaiStore.set(currentSelectAtom, index))
      }}
    >
      <Link
        href={item.url}
        className="relative z-10 flex w-full justify-between p-3"
      >
        <span className="block min-w-0 flex-1 shrink-0 truncate">
          {item.title}
        </span>
        <span className="block min-w-0 shrink-0 grow-0 text-zinc-800 dark:text-slate-200/80">
          {item.subtitle}
        </span>
      </Link>
    </li>
  )
})
