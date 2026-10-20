import { locales } from '~/i18n/config'

import { isStandaloneHtmlPage } from './page-render-mode'

// Static routes take precedence over the existing /[locale]/[slug] page route.
const reservedSlugs = new Set<string>([
  ...locales,
  'api',
  'common',
  'dashboard',
  'feed',
  'friends',
  'home-og',
  'markdown',
  'notes',
  'og',
  'posts',
  'preview',
  'projects',
  'says',
  'sitemap',
  'thinking',
  'timeline',
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function getPageSlug(pathname: string) {
  const segments = pathname.slice(1).split('/')
  if ((locales as readonly string[]).includes(segments[0])) segments.shift()
  if (segments.length !== 1 || !segments[0]) return null

  try {
    const slug = decodeURIComponent(segments[0])
    if (
      reservedSlugs.has(slug) ||
      slug.startsWith('_') ||
      /[./\\]/.test(slug)
    ) {
      return null
    }
    return slug
  } catch {
    return null
  }
}

/** Public, untranslated reads only; never use the cookie-forwarding SSR fetch. */
export async function getStandalonePageResponse(
  request: Request,
  apiUrl: string,
): Promise<Response | null> {
  if (!apiUrl || !['GET', 'HEAD'].includes(request.method)) return null
  const url = new URL(request.url)
  const slug = getPageSlug(url.pathname)
  if (!slug) return null

  let page: Record<string, unknown>
  try {
    const endpoint = new URL(apiUrl, url)
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}/pages/slug/${encodeURIComponent(slug)}`
    endpoint.search = ''
    endpoint.hash = ''

    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        // Match ordinary Shiro SSR reads without forwarding session headers.
        'User-Agent': `${request.headers.get('user-agent') || 'Shiro'} Shiro/HTML`,
      },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null
    const envelope: unknown = await response.json()
    if (!isRecord(envelope) || !isRecord(envelope.data)) return null
    page = envelope.data
  } catch {
    // Keep the existing page renderer's not-found / upstream error behavior.
    return null
  }

  if (!isRecord(page.meta) || !isStandaloneHtmlPage({ meta: page.meta })) {
    return null
  }

  const headers = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }
  // Core responses can use snake_case; do not mistake a Lexical export for HTML.
  const contentFormat = page.contentFormat ?? page.content_format
  if (
    typeof page.text !== 'string' ||
    !page.text.trim() ||
    (contentFormat !== undefined && contentFormat !== 'markdown')
  ) {
    return new Response(
      request.method === 'HEAD'
        ? null
        : 'HTML pages require non-empty HTML source in text and contentFormat: "markdown".',
      {
        status: 422,
        headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
      },
    )
  }

  const canonicalPath = `/${encodeURIComponent(slug)}`
  if (url.pathname !== canonicalPath) {
    url.pathname = canonicalPath
    return new Response(null, {
      status: 307,
      headers: { ...headers, Location: url.toString() },
    })
  }

  return new Response(request.method === 'HEAD' ? null : page.text, {
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  })
}
