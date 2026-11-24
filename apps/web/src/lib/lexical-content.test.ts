import { QuoteNode } from '@lexical/rich-text'
import type { SerializedEditorState } from 'lexical'
import { $getRoot, createEditor } from 'lexical'
import { describe, expect, it } from 'vitest'

import {
  canRenderLexicalContent,
  normalizeLexicalContent,
} from './lexical-content'

const state = (children: Record<string, unknown>[]) =>
  ({ root: { children, type: 'root', version: 1 } }) as SerializedEditorState

describe('Core Lexical content normalization', () => {
  it('falls back before SSR for unsupported nodes and malformed JSON', () => {
    const supported = new Set(['root', 'paragraph', 'text', 'quote'])
    expect(
      canRenderLexicalContent(
        JSON.stringify(
          state([{ type: 'paragraph', version: 1, children: [] }]),
        ),
        supported,
      ),
    ).toBe(true)
    expect(
      canRenderLexicalContent(
        JSON.stringify(state([{ type: 'future-core-node', version: 1 }])),
        supported,
      ),
    ).toBe(false)
    expect(canRenderLexicalContent('{', supported)).toBe(false)
    expect(canRenderLexicalContent('null', supported)).toBe(false)
    expect(canRenderLexicalContent('{}', supported)).toBe(false)
  })
  it('preserves prose and chart data from a Core 18.2.5 document', () => {
    const paragraph = (text: string) => ({
      children: [{ text, type: 'text', version: 1 }],
      type: 'paragraph',
      version: 1,
    })
    const spec = {
      data: [{ after: 0, before: 36, component: 'Toolbar' }],
      series: [{ key: 'before' }, { key: 'after' }],
      type: 'bar',
      version: 1,
      x: 'component',
    }
    const original = state([
      paragraph('Before the chart'),
      { spec: JSON.stringify(spec), type: 'chart', version: 1 },
      paragraph('After the chart'),
    ])
    const supported = new Set(['root', 'paragraph', 'text', 'quote'])

    expect(canRenderLexicalContent(JSON.stringify(original), supported)).toBe(
      true,
    )
    const editor = createEditor({ nodes: [QuoteNode] })
    const rendered = editor.parseEditorState(normalizeLexicalContent(original))
    expect(rendered.read(() => $getRoot().getTextContent())).toMatch(
      /Before the chart[\s\S]*Toolbar: before: 36, after: 0[\s\S]*After the chart/,
    )
    expect(original.root.children[1]).toMatchObject({ type: 'chart' })
  })

  it.each(['{', 'null', '{"version":2}', ' '.repeat(256_001)])(
    'keeps malformed or unsupported chart blocks local (%#)',
    (spec) => {
      const original = state([{ spec, type: 'chart', version: 1 }])
      expect(
        canRenderLexicalContent(
          JSON.stringify(original),
          new Set(['root', 'paragraph', 'text']),
        ),
      ).toBe(true)
      expect(normalizeLexicalContent(original).root.children[0]).toMatchObject({
        children: [{ text: 'Chart data unavailable' }],
        type: 'paragraph',
      })
    },
  )

  it('bounds chart data and preserves zero and missing values', () => {
    const original = state([
      {
        spec: JSON.stringify({
          data: Array.from({ length: 60 }, (_, i) => ({
            label: `row ${i}`,
            value: i === 0 ? 0 : null,
          })),
          series: [{ key: 'value', label: 'Count' }, { key: 'constructor' }],
          title: 'Results',
          type: 'line',
          version: 1,
          x: 'label',
        }),
        type: 'chart',
        version: 1,
      },
    ])
    const editor = createEditor({ nodes: [QuoteNode] })
    const rendered = editor.parseEditorState(normalizeLexicalContent(original))
    const text = rendered.read(() => $getRoot().getTextContent())
    expect(text).toContain('Results (chart data)')
    expect(text).toContain('row 0: Count: 0, constructor: —')
    expect(text).toContain('row 49: Count: —, constructor: —')
    expect(text).not.toContain('row 50')
    expect(text).toContain('Chart data truncated')
  })

  it('preserves bounded captions and distinguishes valid empty chart data', () => {
    const original = state([
      {
        spec: JSON.stringify({
          data: [],
          note: 'Draft numbers',
          series: [{ key: 'value' }],
          source: 'Local sample',
          subtitle: 's'.repeat(140),
          title: 'Benchmarks',
          type: 'bar',
          version: 1,
          x: 'category',
        }),
        type: 'chart',
        version: 1,
      },
    ])
    const normalized = normalizeLexicalContent(original)
    expect(normalized.root.children[0]).toMatchObject({
      children: [
        { children: [{ text: 'Benchmarks (chart data)' }] },
        { children: [{ text: 's'.repeat(120) }] },
        { children: [{ text: 'No data yet' }] },
        { children: [{ text: 'Draft numbers' }] },
        { children: [{ text: 'Source: Local sample' }] },
      ],
      type: 'quote',
    })
  })

  it.each([
    ['ms', '0 ms', '22 ms', '−2 ms'],
    ['%', '0%', '22%', '−2%'],
    ['$', '$0', '$22', '−$2'],
  ])(
    'uses %s only for finite numeric series values',
    (unit, zero, value, negative) => {
      const original = state([
        {
          spec: JSON.stringify({
            data: [
              { category: 123, zero: 0, value: 22, negative: -2, text: 'raw' },
            ],
            format: { unit },
            series: ['zero', 'value', 'negative', 'missing', 'text'].map(
              (key) => ({ key }),
            ),
            type: 'line',
            version: 1,
            x: 'category',
          }),
          type: 'chart',
          version: 1,
        },
      ])
      const editor = createEditor({ nodes: [QuoteNode] })
      const normalized = editor.parseEditorState(
        normalizeLexicalContent(original),
      )
      expect(normalized.read(() => $getRoot().getTextContent())).toContain(
        `123: zero: ${zero}, value: ${value}, negative: ${negative}, missing: —, text: raw`,
      )
    },
  )

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
