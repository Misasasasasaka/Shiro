'use client'

import type { FC, MouseEvent } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { tv } from 'tailwind-variants'

import { clsxm } from '~/lib/helper'

const styles = tv({
  base: clsxm(
    'relative mb-[1.5px] inline-block min-w-0 max-w-full leading-normal text-base-content/70',
    'truncate text-left tabular-nums transition-all duration-300 hover:text-base-content focus-visible:text-base-content',
  ),
  variants: {
    status: {
      active: 'ml-2 font-medium text-base-content',
    },
  },
})
export interface ITocItem {
  depth: number
  title: string
  anchorId: string
  index: number

  $heading: HTMLHeadingElement
}

export const TocItem: FC<{
  heading: ITocItem

  active: boolean
  rootDepth: number
  onClick?: (i: number, $el: HTMLElement | null, anchorId: string) => void
}> = memo((props) => {
  const { active, rootDepth, onClick, heading } = props
  const { $heading, anchorId, depth, index, title } = heading

  const $ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (active) {
      $ref.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const renderDepth = useMemo(() => {
    const result = depth - rootDepth

    return result
  }, [depth, rootDepth])

  return (
    <a
      ref={$ref}
      data-index={index}
      href={`#${anchorId}`}
      aria-current={active ? 'location' : undefined}
      className={clsxm(
        styles({
          status: active ? 'active' : undefined,
        }),
      )}
      style={useMemo(
        () => ({
          paddingLeft:
            depth >= rootDepth ? `${renderDepth * 0.6 + 0.5}rem` : '0.5rem',
        }),
        [depth, renderDepth, rootDepth],
      )}
      data-depth={depth}
      onClick={useCallback(
        (e: MouseEvent) => {
          e.preventDefault()

          onClick?.(index, $heading, anchorId)
        },
        [onClick, index, $heading, anchorId],
      )}
      title={title}
    >
      <span className="cursor-pointer">{title}</span>
    </a>
  )
})

TocItem.displayName = 'TocItem'
