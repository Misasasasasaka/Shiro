import type { CommentAnchorModel } from '@mx-space/api-client'

type AnchorMetadata = Omit<
  CommentAnchorModel,
  | 'blockFingerprint'
  | 'blockId'
  | 'blockType'
  | 'endOffset'
  | 'mode'
  | 'prefix'
  | 'quote'
  | 'snapshotText'
  | 'startOffset'
  | 'suffix'
>

export interface BlockAnchor extends AnchorMetadata {
  blockFingerprint: string
  blockId: string
  blockType: string
  mode: 'block'
  snapshotText: string
  lang?: string | null
}

export interface RangeAnchor extends AnchorMetadata {
  blockFingerprint: string
  blockId: string
  blockType: string
  endOffset: number
  mode: 'range'
  prefix: string
  quote: string
  snapshotText: string
  startOffset: number
  suffix: string
  lang?: string | null
}

export type CommentAnchor = BlockAnchor | RangeAnchor

export const normalizeCommentAnchor = (
  anchor: CommentAnchorModel | null | undefined,
): CommentAnchor | null => {
  if (!anchor?.blockId) return null

  const shared = {
    ...anchor,
    blockFingerprint: anchor.blockFingerprint ?? '',
    blockType: anchor.blockType ?? '',
    snapshotText: anchor.snapshotText ?? '',
  }

  if (anchor.mode === 'block') {
    return { ...shared, mode: 'block' }
  }

  if (anchor.mode === 'range') {
    return {
      ...shared,
      endOffset: anchor.endOffset ?? 0,
      mode: 'range',
      prefix: anchor.prefix ?? '',
      quote: anchor.quote ?? '',
      startOffset: anchor.startOffset ?? 0,
      suffix: anchor.suffix ?? '',
    }
  }

  return null
}

export interface CommentBaseProps {
  afterSubmit?: () => void

  anchor?: CommentAnchor | null
  autoFocus?: boolean

  compact?: boolean
  initialValue?: string
  refId: string
}
