import { describe, expect, it, vi } from 'vitest'

import { AccentColorStyleInjector } from './AccentColorStyleInjector'

vi.mock('server-only', () => ({}))

describe('AccentColorStyleInjector', () => {
  it('restores the tinted root background and paper noise', async () => {
    const style = await AccentColorStyleInjector({
      color: {
        light: ['#33A6B8'],
        dark: ['#F596AA'],
      },
    })
    const props = style.props as {
      dangerouslySetInnerHTML: { __html: string }
    }
    const css = props.dangerouslySetInnerHTML.__html

    expect(css).toContain('--color-root-bg: #f0f6f7')
    expect(css).toContain('--color-root-bg: #271a2a')
    expect(css).toContain("html[data-theme='light'].noise body::before")
    expect(css).toContain("html[data-theme='dark'].noise body::before")
    expect(css.match(/data:image\/png;base64/g)).toHaveLength(2)
  })
})
