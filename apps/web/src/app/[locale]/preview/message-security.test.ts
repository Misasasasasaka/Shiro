import { describe, expect, it } from 'vitest'

import {
  getTrustedPreviewOrigin,
  isTrustedPreviewMessage,
} from './message-security'

describe('preview message security', () => {
  it('accepts only the configured admin origin', () => {
    expect(
      getTrustedPreviewOrigin(
        'https://admin.example.com/preview',
        'https://admin.example.com/#/editor',
      ),
    ).toBe('https://admin.example.com')

    expect(
      getTrustedPreviewOrigin(
        'https://attacker.example/preview',
        'https://admin.example.com/#/editor',
      ),
    ).toBeNull()
  })

  it('rejects missing and invalid origin configuration', () => {
    expect(
      getTrustedPreviewOrigin(null, 'https://admin.example.com'),
    ).toBeNull()
    expect(
      getTrustedPreviewOrigin('not-a-url', 'https://admin.example.com'),
    ).toBeNull()
    expect(
      getTrustedPreviewOrigin('https://admin.example.com', null),
    ).toBeNull()
  })

  it('requires both the expected origin and window', () => {
    const expectedSource = {}

    expect(
      isTrustedPreviewMessage(
        { origin: 'https://admin.example.com', source: expectedSource },
        'https://admin.example.com',
        expectedSource,
      ),
    ).toBe(true)

    expect(
      isTrustedPreviewMessage(
        { origin: 'https://attacker.example', source: expectedSource },
        'https://admin.example.com',
        expectedSource,
      ),
    ).toBe(false)

    expect(
      isTrustedPreviewMessage(
        { origin: 'https://admin.example.com', source: {} },
        'https://admin.example.com',
        expectedSource,
      ),
    ).toBe(false)
  })
})
