import type { SerializedEditorState } from 'lexical'

type JsonObject = Record<string, unknown>

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const createTextNode = (text: string): JsonObject => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text,
  type: 'text',
  version: 1,
})

const createParagraphNode = (text: string): JsonObject => ({
  children: [createTextNode(text)],
  direction: null,
  format: '',
  indent: 0,
  textFormat: 0,
  textStyle: '',
  type: 'paragraph',
  version: 1,
})

const getString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const chartTypes = new Set(['area', 'bar', 'line', 'pie', 'scatter'])
const prefixUnits = new Set(['$', '¥', '€', '£'])
const attachedUnits = new Set(['%', '×', 'x'])
const maxChartSpecLength = 256_000
const maxChartRows = 50
const maxChartSeries = 12

const chartText = (value: unknown) => getString(value).slice(0, 120)

function chartValue(row: JsonObject, key: string, unit = ''): string {
  const value = Object.hasOwn(row, key) ? row[key] : undefined
  if (typeof value !== 'number' || !Number.isFinite(value))
    return chartText(value) || '—'
  if (!unit) return String(value)

  // Match native unit placement without rounding the fallback's raw values.
  const sign = value < 0 ? '−' : ''
  const magnitude = String(Math.abs(value))
  if (prefixUnits.has(unit)) return `${sign}${unit}${magnitude}`
  const number = `${sign}${magnitude}`
  if (attachedUnits.has(unit)) return `${number}${unit}`
  return `${number} ${unit}`
}

function chartFallback(node: JsonObject): JsonObject {
  const fallback = createParagraphNode('Chart data unavailable')
  if (node.version !== 1 || typeof node.spec !== 'string') return fallback
  if (node.spec.length > maxChartSpecLength) return fallback

  let spec: unknown
  try {
    spec = JSON.parse(node.spec)
  } catch {
    return fallback
  }
  if (
    !isJsonObject(spec) ||
    spec.version !== 1 ||
    !chartTypes.has(getString(spec.type)) ||
    typeof spec.x !== 'string' ||
    !spec.x ||
    !Array.isArray(spec.series) ||
    !Array.isArray(spec.data)
  )
    return fallback

  const series = spec.series.slice(0, maxChartSeries).flatMap((series) => {
    if (!isJsonObject(series) || typeof series.key !== 'string' || !series.key)
      return []
    return [
      {
        key: series.key,
        label: chartText(series.label) || chartText(series.key),
      },
    ]
  })
  const { x } = spec
  const rows = spec.data.slice(0, maxChartRows).filter(isJsonObject)
  if (series.length === 0 || (spec.data.length > 0 && rows.length === 0))
    return fallback

  const title = chartText(spec.title)
  const subtitle = chartText(spec.subtitle)
  const note = chartText(spec.note)
  const source = chartText(spec.source)
  const unit = isJsonObject(spec.format) ? chartText(spec.format.unit) : ''
  const heading = title ? `${title} (chart data)` : 'Chart data'
  const children = [createParagraphNode(heading)]
  if (subtitle) children.push(createParagraphNode(subtitle))
  if (spec.data.length === 0) children.push(createParagraphNode('No data yet'))
  for (const row of rows) {
    children.push(
      createParagraphNode(
        `${chartValue(row, x)}: ${series
          .map(({ key, label }) => `${label}: ${chartValue(row, key, unit)}`)
          .join(', ')}`,
      ),
    )
  }
  if (spec.data.length > maxChartRows || spec.series.length > maxChartSeries)
    children.push(createParagraphNode('Chart data truncated'))
  if (note) children.push(createParagraphNode(note))
  if (source) children.push(createParagraphNode(`Source: ${source}`))

  return {
    children,
    direction: null,
    format: '',
    indent: 0,
    type: 'quote',
    version: 1,
    ...(isJsonObject(node.$) ? { $: node.$ } : {}),
  }
}

/**
 * Core stores Lexical JSON as authored and can therefore return nodes created by
 * a newer editor than the renderer bundled with this Shiro release. Keep the
 * document readable while preserving the native Core response: only newer
 * presentation nodes unsupported by the renderer are lowered to built-in
 * Lexical nodes here.
 */
export function normalizeLexicalContent(
  value: SerializedEditorState,
): SerializedEditorState {
  return normalizeNode(value) as SerializedEditorState
}

/** Preflight newer editor nodes before the static renderer runs during SSR. */
export function canRenderLexicalContent(
  content: string,
  nodeTypes: ReadonlySet<string>,
) {
  try {
    const state = normalizeLexicalContent(JSON.parse(content))
    if (!isJsonObject(state.root) || !Array.isArray(state.root.children))
      return false
    const supported = (value: unknown): boolean => {
      if (Array.isArray(value)) return value.every(supported)
      if (!isJsonObject(value)) return true
      if (
        typeof value.type === 'string' &&
        typeof value.version === 'number' &&
        !nodeTypes.has(value.type)
      )
        return false
      return Object.values(value).every(supported)
    }
    return supported(state)
  } catch {
    return false
  }
}

function normalizeNode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeNode)
  if (!isJsonObject(value)) return value

  const normalized = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, normalizeNode(child)]),
  )

  switch (normalized.type) {
    case 'chart':
      return chartFallback(normalized)
    case 'rich-quote': {
      const attribution = getString(normalized.attribution)
      const children = Array.isArray(normalized.children)
        ? [...normalized.children]
        : []

      if (attribution) children.push(createParagraphNode(`— ${attribution}`))

      return {
        ...normalized,
        attribution: undefined,
        children,
        type: 'quote',
      }
    }
    case 'chat': {
      const participants = Array.isArray(normalized.participants)
        ? normalized.participants.filter(isJsonObject)
        : []
      const participantNames = new Map(
        participants.map((participant) => {
          const id = getString(participant.id)
          const name =
            getString(participant.name) ||
            (participant.kind === 'agent' ? 'Assistant' : 'User')
          return [id, name] as const
        }),
      )
      const messages = Array.isArray(normalized.messages)
        ? normalized.messages.filter(isJsonObject)
        : []
      const children = messages.map((message) => {
        const speaker =
          participantNames.get(getString(message.participantId)) || 'Message'
        const content = getString(message.content)
        return createParagraphNode(`${speaker}: ${content}`)
      })

      return {
        children:
          children.length > 0
            ? children
            : [createParagraphNode('Conversation')],
        direction: null,
        format: '',
        indent: 0,
        type: 'quote',
        version: 1,
        ...(isJsonObject(normalized.$) ? { $: normalized.$ } : {}),
      }
    }
    case 'stock': {
      const symbol = getString(normalized.symbol) || 'Stock'
      const variant = getString(normalized.variant)
      const range = isJsonObject(normalized.range) ? normalized.range : null
      const from = range ? getString(range.from) : ''
      const to = range ? getString(range.to) : ''
      const interval = range ? getString(range.interval) : ''
      const ema = Array.isArray(normalized.ema)
        ? normalized.ema.filter(
            (item): item is number =>
              typeof item === 'number' && Number.isFinite(item),
          )
        : []
      const details = [
        variant,
        from && to ? `${from} – ${to}` : from || to,
        interval,
      ]
        .filter(Boolean)
        .join(' · ')
      const label = `${symbol}${details ? ` · ${details}` : ''}${
        ema.length > 0 ? ` · EMA ${ema.join('/')}` : ''
      }`

      return {
        ...createParagraphNode(label),
        ...(isJsonObject(normalized.$) ? { $: normalized.$ } : {}),
      }
    }
    default:
      return normalized
  }
}
