import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { LazyLoad } from '~/components/common/Lazyload'
import { useCanComment } from '~/providers/root/aggregation-data-provider'

import { CommentBoxRoot } from './CommentBox/Root'
import { Comments } from './Comments'
import { CommentSkeleton } from './CommentSkeleton'
import type { CommentBaseProps } from './types'

export const CommentAreaRoot: FC<
  CommentBaseProps & {
    allowComment?: boolean
  }
> = (props) => {
  const t = useTranslations('comment')
  // const header = headers()
  // const geo = header.get(REQUEST_GEO)

  // const isCN = geo === 'CN'

  // if (isCN) return <NotSupport />

  const { allowComment, refId } = props
  const globallyAllowed = useCanComment()
  const canComment = allowComment ?? globallyAllowed
  if (!canComment) {
    return (
      <p className="mt-[7.1rem] text-center text-xl font-medium">
        {t('comments_closed')}
      </p>
    )
  }

  return (
    <div className="relative mt-12">
      <CommentBoxRoot refId={refId} />

      <div className="h-12" />
      <LazyLoad triggerOnce placeholder={<CommentSkeleton />}>
        <Comments refId={refId} />
      </LazyLoad>
    </div>
  )
}
