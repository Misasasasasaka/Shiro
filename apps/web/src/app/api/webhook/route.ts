import type { NextRequest } from 'next/server'

import { isBusinessEvent, verifyWebhookSignatures } from '~/lib/webhook'

export const POST = async (request: NextRequest) => {
  const secret = process.env.WEBHOOK_SECRET
  if (!secret) {
    return new Response('WEBHOOK_SECRET is not set', { status: 500 })
  }

  const rawBody = await request.text()
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const signedPayload = JSON.stringify(payload)
  const signaturesValid = verifyWebhookSignatures({
    payload: signedPayload,
    secret,
    signatureSha1: request.headers.get('x-webhook-signature'),
    signatureSha256: request.headers.get('x-webhook-signature256'),
  })
  if (!signaturesValid) {
    return new Response('Invalid Signature', { status: 400 })
  }

  const event = request.headers.get('x-webhook-event')
  if (event === 'health_check' || (event && isBusinessEvent(event))) {
    return new Response('OK')
  }

  return new Response('MISS')
}
