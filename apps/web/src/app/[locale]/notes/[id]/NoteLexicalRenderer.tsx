'use client'

import { ErrorBoundary } from 'react-error-boundary'

import { MainLexicalContent } from '~/components/ui/rich-content/MainLexicalContent'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'

import { NoteMarkdownRenderer } from './NoteMarkdownRenderer'

export const NoteLexicalRenderer = () => {
  const content = useCurrentNoteDataSelector((data) => data?.content)
  if (!content) return <NoteMarkdownRenderer />
  return (
    <ErrorBoundary fallback={<NoteMarkdownRenderer />} resetKeys={[content]}>
      <MainLexicalContent
        fallback={<NoteMarkdownRenderer />}
        className="mt-10"
        content={content}
        variant="note"
      />
    </ErrorBoundary>
  )
}
