'use client'

import { useMemo } from 'react'

import { decodeThumbhashToDataUrl } from '~/lib/image'

export const ThumbhashPlaceholder = ({
  className,
  thumbhash,
}: {
  className?: string
  thumbhash: string
}) => {
  const src = useMemo(() => decodeThumbhashToDataUrl(thumbhash), [thumbhash])

  if (!src) return null

  return <img aria-hidden alt="" className={className} src={src} />
}
