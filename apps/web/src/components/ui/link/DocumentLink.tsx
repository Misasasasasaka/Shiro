'use client'

import type { AnchorHTMLAttributes } from 'react'

import { Link } from '~/i18n/navigation'

type DocumentLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  reloadDocument?: boolean
}

/** HTML documents must leave the React tree and use the browser's HTML parser. */
export function DocumentLink({ reloadDocument, ...props }: DocumentLinkProps) {
  return reloadDocument ? <a {...props} /> : <Link {...props} />
}
