'use client'

import {
  allNodes,
  codeSnippetNodes,
  embedNodes,
  ExcalidrawNode,
  galleryNodes,
} from '@haklex/rich-kit-shiro'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { setMainMarkdownElement } from '~/atoms/hooks/reading'
import { MAIN_CONTENT_ID } from '~/constants/dom-id'
import { DOMCustomEvents } from '~/constants/event'
import { canRenderLexicalContent } from '~/lib/lexical-content'
import { springScrollToElement } from '~/lib/scroller'

import type { LexicalContentProps } from './LexicalContent'
import { LexicalContent } from './LexicalContent'

const rendererNodeTypes = new Set([
  'root',
  'text',
  'paragraph',
  'linebreak',
  'tab',
  'nested-doc',
  ...[
    ...allNodes,
    ...codeSnippetNodes,
    ...embedNodes,
    ExcalidrawNode,
    ...galleryNodes,
  ].map((node) => node.getType()),
])

function useRichHeadingAnchorEnhancer(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('.rich-heading-anchor')
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return

      e.preventDefault()
      const href = anchor.getAttribute('href')
      if (!href?.startsWith('#')) return

      const id = decodeURIComponent(href.slice(1))
      const target = document.getElementById(id)
      if (!target) return

      history.replaceState(history.state, '', href)
      springScrollToElement(target, -100)
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [containerRef])
}

export function MainLexicalContent(
  props: LexicalContentProps & { fallback?: ReactNode },
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const supported = useMemo(
    () => canRenderLexicalContent(props.content, rendererNodeTypes),
    [props.content],
  )

  const ref = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element
    setMainMarkdownElement(element)
  }, [])

  useRichHeadingAnchorEnhancer(containerRef)

  useEffect(() => {
    document.dispatchEvent(new CustomEvent(DOMCustomEvents.RefreshToc))
  }, [props.content])

  if (!supported) return props.fallback ?? null

  return (
    <div id={MAIN_CONTENT_ID} ref={ref}>
      <LexicalContent {...props} />
    </div>
  )
}
