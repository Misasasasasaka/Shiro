import {
  BusinessEvents,
  verifyWebhook,
  verifyWebhookSha1,
} from '@mx-space/webhook'

const businessEvents = new Set<string>(Object.values(BusinessEvents))

export const isBusinessEvent = (event: string): event is BusinessEvents =>
  businessEvents.has(event)

export const verifyWebhookSignatures = ({
  payload,
  secret,
  signatureSha1,
  signatureSha256,
}: {
  payload: string
  secret: string
  signatureSha1: string | null
  signatureSha256: string | null
}) => {
  if (!signatureSha1 || !signatureSha256) return false

  try {
    return (
      verifyWebhook(secret, payload, signatureSha256) &&
      verifyWebhookSha1(secret, payload, signatureSha1)
    )
  } catch {
    return false
  }
}
