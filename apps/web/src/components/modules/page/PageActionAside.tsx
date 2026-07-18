'use client'

import { useCurrentPageDataSelector } from '~/providers/page/CurrentPageDataProvider'
import { useCanComment } from '~/providers/root/aggregation-data-provider'

import { ActionAsideContainer } from '../shared/ActionAsideContainer'
import { AsideCommentButton } from '../shared/AsideCommentButton'
import { AsideDonateButton } from '../shared/AsideDonateButton'

export const PageActionAside: Component = ({ className }) => (
  <ActionAsideContainer className={className}>
    <PageAsideCommentButton />
    <AsideDonateButton />
  </ActionAsideContainer>
)

const PageAsideCommentButton = () => {
  const { title, id } =
    useCurrentPageDataSelector((data) => ({
      title: data?.title,
      id: data?.id,
    })) || {}
  const allowComment = useCanComment()
  if (!id || !allowComment || !title) return null
  return <AsideCommentButton refId={id} title={title} />
}
