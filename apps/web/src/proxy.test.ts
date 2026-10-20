import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { proxy } from './proxy'

vi.mock('./constants/env', () => ({ API_URL: 'https://core.example/api/v3' }))
vi.mock('@vercel/functions', () => ({
  geolocation: () => {},
  ipAddress: () => {},
}))
vi.mock('next-intl/middleware', async () => {
  const { NextResponse } = await import('next/server.js')
  return {
    default: () => (request: NextRequest) => {
      const { pathname } = request.nextUrl
      if (pathname === '/zh' || pathname.startsWith('/zh/')) {
        const destination = request.nextUrl.clone()
        destination.pathname = pathname.slice(3) || '/'
        return NextResponse.redirect(destination)
      }

      const destination = request.nextUrl.clone()
      destination.pathname = `/zh${pathname === '/' ? '' : pathname}`
      const headers = new Headers(request.headers)
      headers.set('x-next-intl-locale', 'zh')
      return NextResponse.rewrite(destination, { request: { headers } })
    },
  }
})

afterEach(() => vi.unstubAllGlobals())

describe('locale proxy', () => {
  it('rewrites an unprefixed default-locale route without redirecting', async () => {
    const response = await proxy(
      new NextRequest('http://localhost:2323/posts', {
        headers: { 'accept-language': 'zh-CN' },
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:2323/zh/posts',
    )
    expect(response.headers.get('x-middleware-request-request_locale')).toBe(
      'zh',
    )
  })

  it('redirects an explicit default locale to its canonical unprefixed URL', async () => {
    const response = await proxy(
      new NextRequest('http://localhost:2323/zh/posts'),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:2323/posts')
  })

  it('does not redirect an internal default-locale rewrite back to itself', async () => {
    const response = await proxy(
      new NextRequest('http://localhost:2323/zh/posts', {
        headers: {
          request_pathname: '/posts',
          'x-next-intl-locale': 'zh',
        },
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(response.headers.get('x-middleware-request-request_pathname')).toBe(
      '/posts',
    )
    expect(response.headers.get('x-middleware-request-request_locale')).toBe(
      'zh',
    )
  })

  it('does not mistake the OG route for an unsupported locale', async () => {
    const response = await proxy(
      new NextRequest('http://localhost:2323/og?data=fixture'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:2323/zh/og?data=fixture',
    )
  })

  it('serves marked HTML before locale negotiation and blog layouts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          data: {
            meta: { render: 'html' },
            contentFormat: 'markdown',
            text: '<html>Original</html>',
          },
        }),
      ),
    )
    const response = await proxy(
      new NextRequest('http://localhost:2323/demo', {
        headers: { 'accept-language': 'ja', cookie: 'NEXT_LOCALE=ja' },
      }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(response.headers.get('location')).toBeNull()
    expect(await response.text()).toBe('<html>Original</html>')
  })

  it('retains ordinary page localization without probing its internal rewrite twice', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ data: { text: '# About' } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const response = await proxy(new NextRequest('http://localhost:2323/about'))
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:2323/zh/about',
    )
    const internal = await proxy(
      new NextRequest('http://localhost:2323/zh/about', {
        headers: { request_pathname: '/about', 'x-next-intl-locale': 'zh' },
      }),
    )
    expect(internal.headers.get('location')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
