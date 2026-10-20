import type { AnchorHTMLAttributes } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DocumentLink } from './DocumentLink'

vi.mock('~/i18n/navigation', () => ({
  Link: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a data-client-navigation="true" {...props} />
  ),
}))

describe('document navigation', () => {
  it('uses a native anchor with query, fragment and browser link behavior', () => {
    const markup = renderToStaticMarkup(
      <DocumentLink
        reloadDocument
        href="/demo?view=full#counter"
        target="_blank"
        rel="noopener"
        className="page-link"
      >
        HTML page
      </DocumentLink>,
    )
    expect(markup).toContain('href="/demo?view=full#counter"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('class="page-link"')
    expect(markup).not.toContain('data-client-navigation')
    expect(markup).not.toContain('reloadDocument')
  })

  it('retains the localized client link for ordinary pages', () => {
    expect(
      renderToStaticMarkup(<DocumentLink href="/about">About</DocumentLink>),
    ).toContain('data-client-navigation="true"')
  })
})
