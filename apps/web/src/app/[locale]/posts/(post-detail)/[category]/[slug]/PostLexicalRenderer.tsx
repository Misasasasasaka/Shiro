'use client'

import { ErrorBoundary } from 'react-error-boundary'

import { MainLexicalContent } from '~/components/ui/rich-content/MainLexicalContent'
import { useCurrentPostDataSelector } from '~/providers/post/CurrentPostDataProvider'

import { PostMarkdownRenderer } from './PostMarkdownRenderer'

export const PostLexicalRenderer = () => {
  const content = useCurrentPostDataSelector((data) => data?.content)
  if (!content) return <PostMarkdownRenderer />
  return (
    <ErrorBoundary fallback={<PostMarkdownRenderer />} resetKeys={[content]}>
      <MainLexicalContent
        fallback={<PostMarkdownRenderer />}
        className="min-w-0 w-full"
        content={content}
      />
    </ErrorBoundary>
  )
}
