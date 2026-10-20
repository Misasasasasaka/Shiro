'use client'

import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { useCurrentPostDataSelector } from '~/providers/post/CurrentPostDataProvider'

import { PeekLink } from '../peek/PeekLink'

export const PostRelated: FC<{
  type?: 'before' | 'after'
}> = ({ type = 'after' }) => {
  const t = useTranslations('post')
  const infoText = type === 'before' ? t('related_before') : t('related_after')
  const related = useCurrentPostDataSelector(
    (s) => s?.$meta?.related ?? s?.related,
  )
  if (!related) {
    return null
  }

  if (related.length === 0) {
    return null
  }
  return (
    <div data-hide-print className="prose mb-5 mt-8">
      <h3 className="flex items-center gap-2 text-lg font-medium">
        <i className="i-mingcute-question-line" />
        <span>{infoText}</span>
      </h3>
      <ul className="ml-0 mt-4 list-inside list-disc pl-0 text-base leading-relaxed">
        {related.map((post) => {
          if (!post.slug) return null
          const category = 'category' in post ? post.category : undefined
          const href = category
            ? `/posts/${category.slug}/${post.slug}`
            : `/posts/${post.slug}`
          return (
            <li key={href}>
              <PeekLink href={href} className="shiro-link--underline">
                {post.title}
              </PeekLink>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
