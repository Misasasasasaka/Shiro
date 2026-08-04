export type MarkdownTrustLevel = 'trusted' | 'untrusted'

export interface MarkdownSecurityPolicy {
  allowActiveCodeBlocks: boolean
  allowContainers: boolean
  allowScripts: boolean
}

const trustedPolicy: MarkdownSecurityPolicy = {
  allowActiveCodeBlocks: true,
  allowContainers: true,
  allowScripts: true,
}

const untrustedPolicy: MarkdownSecurityPolicy = {
  allowActiveCodeBlocks: false,
  allowContainers: false,
  allowScripts: false,
}

export const resolveMarkdownTrustLevel = (
  inherited: MarkdownTrustLevel,
  requested: MarkdownTrustLevel,
): MarkdownTrustLevel =>
  inherited === 'untrusted' || requested === 'untrusted'
    ? 'untrusted'
    : 'trusted'

export const getMarkdownSecurityPolicy = (
  trustLevel: MarkdownTrustLevel,
): MarkdownSecurityPolicy =>
  trustLevel === 'untrusted' ? untrustedPolicy : trustedPolicy
