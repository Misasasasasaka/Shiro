'use client'

import type { Image } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import type { PropsWithChildren } from 'react'
import { Fragment, useMemo } from 'react'

import { useFocusReading } from '~/atoms/hooks/reading'
import { GoToAdminEditingButton } from '~/components/modules/shared/GoToAdminEditingButton'
import { WithArticleSelectionAction } from '~/components/modules/shared/WithArticleSelectionAction'
import { Link } from '~/i18n/navigation'
import { noopArr } from '~/lib/noop'
import { MarkdownImageRecordProvider } from '~/providers/article/MarkdownImageRecordProvider'
import { useCurrentPageDataSelector } from '~/providers/page/CurrentPageDataProvider'
import {
  useAggregationSelector,
  useCanComment,
} from '~/providers/root/aggregation-data-provider'

import FullPageLoading from '../loading'

export const PageLoading: Component = ({ children }) => {
  const id = useCurrentPageDataSelector((p) => p?.id)

  if (!id) {
    return <FullPageLoading />
  }

  return children
}

export const FocusReadingEffect = () => {
  useFocusReading()
  return null
}

export const MarkdownImageRecordProviderInternal = (
  props: PropsWithChildren,
) => {
  const images = useCurrentPageDataSelector(
    (data) => data?.images || (noopArr as Image[]),
  )
  if (!images) return null

  return (
    <MarkdownImageRecordProvider images={images}>
      {props.children}
    </MarkdownImageRecordProvider>
  )
}

export const PageSubTitle = () => {
  const subtitle = useCurrentPageDataSelector((data) => data?.subtitle)
  return (
    <p className="text-center text-lg text-zinc-600/70 dark:text-neutral-400 lg:text-left">
      {subtitle}
    </p>
  )
}
export const PageTitle = () => {
  const title = useCurrentPageDataSelector((data) => data?.title)
  const id = useCurrentPageDataSelector((data) => data?.id)
  return (
    <>
      <h1 className="text-balance text-center lg:text-left">{title}</h1>
      {id && (
        <GoToAdminEditingButton
          id={id}
          type="pages"
          className="absolute -top-6 right-0"
        />
      )}
    </>
  )
}

export const PagePaginator = () => {
  const t = useTranslations('note')
  const currentPageId = useCurrentPageDataSelector((d) => d?.id)
  const pageList = useAggregationSelector((d) => d.pages)
  const pages = useMemo(() => pageList || [], [pageList])
  const indexInPages = pages.findIndex((page) => page.id === currentPageId)
  const n = pages.length
  const hasNext = indexInPages !== -1 && indexInPages + 1 < n
  const hasPrev = indexInPages > 0
  return (
    <div
      className="relative mt-8 grid h-20 select-none grid-cols-2"
      data-hide-print
    >
      <div className="justify-start">
        {hasPrev && (
          <Fragment>
            <Link
              href={`/${pages[indexInPages - 1].slug}`}
              className="flex flex-col justify-end text-left leading-loose"
            >
              <span className="text-accent">{t('look_back')}</span>
              <span>{pages[indexInPages - 1].title}</span>
            </Link>
          </Fragment>
        )}
      </div>
      <div className="justify-end">
        {hasNext && (
          <Fragment>
            <Link
              href={`/${pages[indexInPages + 1].slug}`}
              className="flex flex-col justify-end text-right leading-loose"
            >
              <span className="text-accent">{t('continue_reading')}</span>
              <span>{pages[indexInPages + 1].title}</span>
            </Link>
          </Fragment>
        )}
      </div>
    </div>
  )
}

export const MarkdownSelection: Component = (props) => {
  const id = useCurrentPageDataSelector((data) => data?.id)
  const title = useCurrentPageDataSelector((data) => data?.title)
  const canComment = useCanComment()
  if (!id || !title) return props.children
  return (
    <WithArticleSelectionAction
      refId={id}
      title={title}
      canComment={canComment}
    >
      {props.children}
    </WithArticleSelectionAction>
  )
}
