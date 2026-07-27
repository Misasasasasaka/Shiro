import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const themeCss = readFileSync(new URL('theme.css', import.meta.url), 'utf8')

describe('theme background', () => {
  it('keeps the tinted gradients and subtle paper noise', () => {
    expect(themeCss).toContain('color-mix(in srgb, var(--color-accent) 12%')
    expect(themeCss).toContain('color-mix(in srgb, var(--color-accent) 10%')
    expect(themeCss).toContain('opacity: 0.05')
    expect(themeCss).toContain('opacity: 0.03')
    expect(themeCss).toContain('pointer-events: none')
  })
})
