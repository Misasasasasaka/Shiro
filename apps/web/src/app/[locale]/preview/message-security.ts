export const getTrustedPreviewOrigin = (
  requestedOrigin: string | null,
  adminUrl: string | null,
) => {
  if (!requestedOrigin || !adminUrl) return null

  try {
    const requested = new URL(requestedOrigin).origin
    const trusted = new URL(adminUrl).origin

    return requested === trusted ? trusted : null
  } catch {
    return null
  }
}

export const isTrustedPreviewMessage = (
  event: { origin: string; source: unknown },
  expectedOrigin: string,
  expectedSource: unknown,
) => event.origin === expectedOrigin && event.source === expectedSource
