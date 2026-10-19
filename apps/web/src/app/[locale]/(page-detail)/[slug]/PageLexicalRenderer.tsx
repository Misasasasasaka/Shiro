'use client'

import { ErrorBoundary } from 'react-error-boundary'

import { MainLexicalContent } from '~/components/ui/rich-content/MainLexicalContent'
import { useCurrentPageDataSelector } from '~/providers/page/CurrentPageDataProvider'

import { PageMarkdownRenderer } from './PageMarkdownRenderer'

export const PageLexicalRenderer = () => {
  const content = useCurrentPageDataSelector((data) => data?.content)
  if (!content) return <PageMarkdownRenderer />
  return (
    <ErrorBoundary fallback={<PageMarkdownRenderer />} resetKeys={[content]}>
      <MainLexicalContent
        fallback={<PageMarkdownRenderer />}
        className="min-w-0 w-full"
        content={content}
      />
    </ErrorBoundary>
  )
}
