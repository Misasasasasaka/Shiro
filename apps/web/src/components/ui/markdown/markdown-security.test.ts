import { describe, expect, it } from 'vitest'

import {
  getMarkdownSecurityPolicy,
  resolveMarkdownTrustLevel,
} from './markdown-security'

describe('markdown security policy', () => {
  it('does not allow nested markdown to upgrade untrusted content', () => {
    expect(resolveMarkdownTrustLevel('untrusted', 'trusted')).toBe('untrusted')
  })

  it('allows trusted markdown to opt into stricter rendering', () => {
    expect(resolveMarkdownTrustLevel('trusted', 'untrusted')).toBe('untrusted')
  })

  it('disables every active content path for untrusted markdown', () => {
    expect(getMarkdownSecurityPolicy('untrusted')).toEqual({
      allowActiveCodeBlocks: false,
      allowContainers: false,
      allowScripts: false,
    })
  })

  it('preserves active content for trusted author content', () => {
    expect(getMarkdownSecurityPolicy('trusted')).toEqual({
      allowActiveCodeBlocks: true,
      allowContainers: true,
      allowScripts: true,
    })
  })
})
