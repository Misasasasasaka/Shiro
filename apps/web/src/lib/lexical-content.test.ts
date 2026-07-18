import type { SerializedEditorState } from 'lexical'
import { describe, expect, it } from 'vitest'

import { normalizeLexicalContent } from './lexical-content'

const state = (children: Record<string, unknown>[]) =>
  ({ root: { children, type: 'root', version: 1 } }) as SerializedEditorState

describe('Core 13 Lexical content normalization', () => {
  it('preserves rich quote children and attribution with built-in nodes', () => {
    const normalized = normalizeLexicalContent(
      state([
        {
          attribution: 'Mix Space',
          children: [{ children: [], type: 'paragraph', version: 1 }],
          type: 'rich-quote',
          version: 1,
        },
      ]),
    )

    expect(normalized.root.children[0]).toMatchObject({
      children: [
        { type: 'paragraph' },
        {
          children: [{ text: '— Mix Space', type: 'text' }],
          type: 'paragraph',
        },
      ],
      type: 'quote',
    })
  })

  it('keeps chat messages readable when the renderer predates chat nodes', () => {
    const normalized = normalizeLexicalContent(
      state([
        {
          messages: [
            { content: 'Hello', participantId: 'reader' },
            { content: 'Hi', participantId: 'assistant' },
          ],
          participants: [
            { id: 'reader', kind: 'user' },
            { id: 'assistant', kind: 'agent', name: 'Shiro' },
          ],
          type: 'chat',
          version: 1,
        },
      ]),
    )

    expect(normalized.root.children[0]).toMatchObject({
      children: [
        { children: [{ text: 'User: Hello' }] },
        { children: [{ text: 'Shiro: Hi' }] },
      ],
      type: 'quote',
    })
  })

  it('converts stock cards without coercing identifiers to numbers', () => {
    const normalized = normalizeLexicalContent(
      state([
        {
          ema: [5, 20],
          range: { from: '2026-01-01', interval: '1h', to: '2026-01-02' },
          symbol: 'AAPL',
          type: 'stock',
          variant: 'kline',
          version: 1,
        },
      ]),
    )

    expect(normalized.root.children[0]).toMatchObject({
      children: [
        {
          text: 'AAPL · kline · 2026-01-01 – 2026-01-02 · 1h · EMA 5/20',
          type: 'text',
        },
      ],
      type: 'paragraph',
    })
  })
})
