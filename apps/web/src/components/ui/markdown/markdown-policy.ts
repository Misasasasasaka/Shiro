import type { MarkdownVariant } from './Markdown'

export const isContainerRuleEnabled = (variant: MarkdownVariant) =>
  variant !== 'comment'
