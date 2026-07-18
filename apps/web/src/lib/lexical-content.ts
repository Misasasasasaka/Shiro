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

/**
 * Core stores Lexical JSON as authored and can therefore return nodes created by
 * a newer editor than the renderer bundled with this Shiro release. Keep the
 * document readable while preserving the native Core 13 response: only newer
 * presentation nodes unsupported by the renderer are lowered to built-in
 * Lexical nodes here.
 */
export function normalizeLexicalContent(
  value: SerializedEditorState,
): SerializedEditorState {
  return normalizeNode(value) as SerializedEditorState
}

function normalizeNode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeNode)
  if (!isJsonObject(value)) return value

  const normalized = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, normalizeNode(child)]),
  )

  switch (normalized.type) {
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
