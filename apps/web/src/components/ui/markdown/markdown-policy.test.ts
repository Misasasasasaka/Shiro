import { describe, expect, it } from 'vitest'

import { isContainerRuleEnabled } from './markdown-policy'

describe('markdown parser policy', () => {
  it('does not enable trusted containers for untrusted comments', () => {
    expect(isContainerRuleEnabled('comment')).toBe(false)
  })

  it.each(['post', 'note'] as const)(
    'preserves containers for the %s variant',
    (variant) => {
      expect(isContainerRuleEnabled(variant)).toBe(true)
    },
  )
})
