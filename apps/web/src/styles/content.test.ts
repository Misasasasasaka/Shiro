import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const contentCss = readFileSync(new URL('content.css', import.meta.url), 'utf8')
const noteFontSource = readFileSync(
  new URL('../components/modules/note/NoteFontFab.tsx', import.meta.url),
  'utf8',
)
const postContainerSource = readFileSync(
  new URL('../app/[locale]/posts/(post-detail)/Container.tsx', import.meta.url),
  'utf8',
)

describe('content reading surface', () => {
  it('uses a warm paper surface with restrained depth', () => {
    expect(contentCss).toContain('--content-paper: #f9f8f5')
    expect(contentCss).toContain('border-radius: 12px')
    expect(contentCss).toContain('0 4px 24px var(--content-paper-shadow)')
  })

  it('keeps sans-serif body copy and reserves serif for hierarchy', () => {
    expect(contentCss).toContain('font-family: var(--font-sans)')
    expect(contentCss).toContain('.rich-heading-h1')
    expect(contentCss).toContain('.rich-quote')
    expect(contentCss).toContain('font-family: var(--font-serif)')
    expect(noteFontSource).toContain(
      "atomWithStorage<Font>('note-font', 'sans')",
    )
  })

  it('centers the post column independently from its right-side rail', () => {
    expect(postContainerSource).toContain('xl:max-w-[1480px]')
    expect(postContainerSource).toContain('xl:pl-[200px]')
  })
})
