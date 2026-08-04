// reverse proxy to github api
//

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getAllowedGitHubPath } from '../github-path'

export const revalidate = 86400 // 24 hours
export const GET = async (req: NextRequest) => {
  const pathname = getAllowedGitHubPath(req.nextUrl.pathname)
  if (!pathname) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const query = new URLSearchParams(req.nextUrl.searchParams)

  query.delete('all')

  const searchString = query.toString()

  const url = `https://api.github.com/${pathname}${
    searchString ? `?${searchString}` : ''
  }`

  const headers = new Headers()
  headers.set(
    'User-Agent',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko), Shiro',
  )
  headers.set('Accept', 'application/vnd.github+json')

  const response = await fetch(url, {
    headers,
  })
  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
