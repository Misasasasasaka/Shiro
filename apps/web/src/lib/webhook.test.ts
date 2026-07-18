import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { verifyWebhookSignatures } from './webhook'

describe('@mx-space/webhook 0.9 signature contract', () => {
  const secret = 'core-13-webhook-secret'
  const payload = JSON.stringify({ data: '9007199254740993001' })

  it('requires and verifies both SHA-1 and SHA-256 signatures', () => {
    expect(
      verifyWebhookSignatures({
        payload,
        secret,
        signatureSha1: createHmac('sha1', secret).update(payload).digest('hex'),
        signatureSha256: createHmac('sha256', secret)
          .update(payload)
          .digest('hex'),
      }),
    ).toBe(true)
  })

  it('rejects missing and malformed signatures', () => {
    expect(
      verifyWebhookSignatures({
        payload,
        secret,
        signatureSha1: null,
        signatureSha256: null,
      }),
    ).toBe(false)
    expect(
      verifyWebhookSignatures({
        payload,
        secret,
        signatureSha1: 'bad',
        signatureSha256: 'bad',
      }),
    ).toBe(false)
  })
})
