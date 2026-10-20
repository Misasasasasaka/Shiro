import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getStandalonePageResponse } from './standalone-page-response'

const apiUrl = 'https://core.example/api/v3'
const html =
  '<!doctype html>\n<html><head><style>body { margin: 0 }</style></head><body>你好<script>window.ready = true</script></body></html>\n'
const page = { meta: { render: 'html' }, contentFormat: 'markdown', text: html }
const fetchMock = vi.fn<typeof fetch>()
const request = (path = '/demo', init?: RequestInit) =>
  new Request(`https://shiro.example${path}`, init)
const serve = (path = '/demo', init?: RequestInit) =>
  getStandalonePageResponse(request(path, init), apiUrl)

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => Response.json({ data: page }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('standalone HTML responses', () => {
  it('returns the exact source without React, Markdown or layout processing', async () => {
    const response = await serve()
    expect(response?.status).toBe(200)
    expect(response?.headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    )
    expect(response?.headers.get('cache-control')).toBe('no-store')
    expect(response?.headers.get('x-content-type-options')).toBe('nosniff')
    expect(await response?.text()).toBe(html)
  })

  it('uses a fresh public untranslated read, not the visitor session or query', async () => {
    await serve('/demo?lang=ja&prefer=lexical&token=visitor&_rsc=test', {
      headers: {
        Cookie: 'session=private',
        Authorization: 'Bearer private',
        'x-api-key': 'private',
        'x-lang': 'ja',
        'User-Agent': 'Mozilla/5.0',
        RSC: '1',
      },
    })
    const [input, init] = fetchMock.mock.calls[0]
    expect(String(input)).toBe(`${apiUrl}/pages/slug/demo`)
    expect(init?.headers).toEqual({
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 Shiro/HTML',
    })
    expect(init).toMatchObject({
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
    })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('returns HTML to RSC requests so Next falls back to document navigation', async () => {
    const response = await serve('/demo?_rsc=test', { headers: { RSC: '1' } })
    expect(response?.headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    )
    expect(await response?.text()).toBe(html)
  })

  it('supports HEAD with the same headers and no body', async () => {
    const response = await serve('/demo', { method: 'HEAD' })
    expect(response?.status).toBe(200)
    expect(response?.headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    )
    expect(await response?.text()).toBe('')
  })

  it.each(['zh', 'en', 'ja'])(
    'canonicalizes the %s alias without losing query parameters',
    async (locale) => {
      const response = await serve(`/${locale}/demo?view=full&lang=ja`)
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe(
        'https://shiro.example/demo?view=full&lang=ja',
      )
      expect(response?.headers.get('cache-control')).toBe('no-store')
    },
  )

  it('encodes a Unicode slug once when calling Core', async () => {
    const response = await serve('/%E4%BD%A0%E5%A5%BD')
    expect(response?.status).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${apiUrl}/pages/slug/%E4%BD%A0%E5%A5%BD`,
    )
  })

  it.each([
    {},
    { render: 'HTML' },
    { render: true },
    { style: 'equipment' },
    null,
  ])('requires the exact page marker: %j', async (meta) => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ data: { ...page, meta }, meta: { render: 'html' } }),
    )
    expect(await serve()).toBeNull()
  })

  it.each([
    { text: undefined },
    { text: null },
    { text: '  \n' },
    { contentFormat: 'lexical' },
    { contentFormat: 'html' },
    { contentFormat: undefined, content_format: 'lexical' },
  ])(
    'reports invalid HTML source without executing it: %j',
    async (invalid) => {
      fetchMock.mockResolvedValueOnce(
        Response.json({ data: { ...page, ...invalid } }),
      )
      const response = await serve()
      expect(response?.status).toBe(422)
      expect(response?.headers.get('content-type')).toBe(
        'text/plain; charset=utf-8',
      )
      expect(await response?.text()).toContain('contentFormat: "markdown"')
    },
  )

  it('accepts the legacy default Markdown format', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ data: { ...page, contentFormat: undefined } }),
    )
    expect(await (await serve())?.text()).toBe(html)
  })

  it.each([
    '/',
    '/zh',
    '/en',
    '/ja',
    '/posts',
    '/en/posts',
    '/notes',
    '/friends',
    '/projects',
    '/thinking',
    '/says',
    '/timeline',
    '/preview',
    '/markdown',
    '/og',
    '/feed',
    '/sitemap',
    '/home-og',
    '/api',
    '/dashboard',
    '/common',
    '/_next',
    '/favicon.ico',
    '/asset%2Ejs',
    '/posts/category/slug',
    '/fr/demo',
    '/demo/nested',
    '/bad%2Fslug',
    '/bad%5Cslug',
    '/%broken',
  ])('does not fetch Core for non-page path %s', async (path) => {
    expect(await serve(path)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not intercept POST or probe an unconfigured API', async () => {
    expect(await serve('/demo', { method: 'POST' })).toBeNull()
    expect(await getStandalonePageResponse(request(), '')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([404, 401, 500, 503])(
    'leaves Core HTTP %s to the existing error handler',
    async (status) => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status }))
      expect(await serve()).toBeNull()
    },
  )

  it('falls through on timeouts, invalid JSON and malformed envelopes', async () => {
    fetchMock.mockRejectedValueOnce(
      new DOMException('Timed out', 'TimeoutError'),
    )
    expect(await serve()).toBeNull()
    fetchMock.mockResolvedValueOnce(new Response('not JSON'))
    expect(await serve()).toBeNull()
    fetchMock.mockResolvedValueOnce(Response.json({ data: [] }))
    expect(await serve()).toBeNull()
  })

  it('observes updates, marker removal and deletion on subsequent requests', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ data: page }))
      .mockResolvedValueOnce(
        Response.json({ data: { ...page, text: '<html>Updated</html>' } }),
      )
      .mockResolvedValueOnce(Response.json({ data: { ...page, meta: null } }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
    expect(await (await serve())?.text()).toBe(html)
    expect(await (await serve())?.text()).toBe('<html>Updated</html>')
    expect(await serve()).toBeNull()
    expect(await serve()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
