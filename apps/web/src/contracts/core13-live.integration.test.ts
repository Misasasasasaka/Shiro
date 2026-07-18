import createClient, { allControllers, metaFor } from '@mx-space/api-client'
import { fetchAdaptor } from '@mx-space/api-client/dist/adaptors/fetch'
import { describe, expect, it } from 'vitest'

import { normalizeCommentThreadPage } from '~/components/modules/comment/contract'
import {
  type Core13SearchResult,
  normalizeCore13SearchPage,
} from '~/lib/search'

const configuredUrl = process.env.CORE13_INTEGRATION_URL
const expectedVersion = process.env.CORE13_EXPECTED_VERSION ?? '13.14.1'

const normalizeEndpoint = (value: string) => {
  const withoutTrailingSlash = value.replace(/\/+$/, '')
  return withoutTrailingSlash.endsWith('/api/v3')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api/v3`
}

const endpoint = configuredUrl ? normalizeEndpoint(configuredUrl) : undefined
const liveDescribe = endpoint ? describe.sequential : describe.skip

liveDescribe('Core 13 live integration', () => {
  const apiClient = createClient(fetchAdaptor)(
    endpoint ?? 'http://127.0.0.1/api/v3',
    {
      controllers: allControllers,
    },
  )

  it('reports the expected Core 13 release and V3 health', async () => {
    const [healthResponse, infoResponse] = await Promise.all([
      fetch(`${endpoint}/health`),
      fetch(`${endpoint}/info`),
    ])
    expect(healthResponse.ok).toBe(true)
    expect(infoResponse.ok).toBe(true)

    const health = (await healthResponse.json()) as {
      data?: { ok?: boolean }
    }
    const info = (await infoResponse.json()) as {
      data?: { name?: string; version?: string }
    }
    expect(health.data?.ok).toBe(true)
    expect(info.data).toMatchObject({
      name: '@mx-space/core',
      version: expectedVersion,
    })
  }, 30_000)

  it('loads aggregate metadata and pages as independent requests', async () => {
    const [aggregate, site, pages] = await Promise.all([
      apiClient.aggregate.getAggregateData('shiro'),
      apiClient.aggregate.getSiteMetadata(),
      apiClient.page.getList(1, 100),
    ])

    expect(typeof aggregate.user.id).toBe('string')
    expect(aggregate.url.webUrl).toMatch(/^https?:\/\//u)
    expect(Reflect.has(aggregate, 'pageMeta')).toBe(false)
    expect(site.seo.title.length).toBeGreaterThan(0)
    expect(Array.isArray(pages.data)).toBe(true)
    expect(pages.pagination.page).toBe(1)
    expect(pages.data.every((item) => typeof item.id === 'string')).toBe(true)
  }, 30_000)

  it('loads post, note and page lists and native detail models', async () => {
    const [posts, notes, pages] = await Promise.all([
      apiClient.post.getList(1, 1, { lang: 'zh-CN' }),
      apiClient.note.getList(1, 1, { lang: 'zh-CN', withSummary: true }),
      apiClient.page.getList(1, 1),
    ])

    const post = posts.data[0]
    const note = notes.data[0]
    const page = pages.data[0]
    expect(post).toBeDefined()
    expect(note).toBeDefined()
    expect(page).toBeDefined()
    if (!post || !note || !page) return

    const [postDetail, noteDetail, pageDetail] = await Promise.all([
      apiClient.post.getPost(post.category.slug, post.slug, { lang: 'zh-CN' }),
      apiClient.note.getNoteByNid(note.nid, { lang: 'zh-CN' }),
      apiClient.page.getBySlug(page.slug),
    ])

    expect(postDetail).toMatchObject({
      createdAt: expect.any(String),
      id: post.id,
      readCount: expect.any(Number),
    })
    expect(noteDetail).toMatchObject({
      createdAt: expect.any(String),
      id: note.id,
      nid: note.nid,
    })
    expect(pageDetail).toMatchObject({
      createdAt: expect.any(String),
      id: page.id,
      slug: page.slug,
    })
    expect(metaFor(postDetail, postDetail.$meta).interaction).toBeDefined()
  }, 30_000)

  it('loads local search with fallback metadata and native pagination', async () => {
    const response = await apiClient.search.searchAll('React', { lang: 'en' })
    const page = normalizeCore13SearchPage<Core13SearchResult>(response)

    expect(Array.isArray(page.data)).toBe(true)
    expect(page.pagination.page).toBeGreaterThan(0)
    expect(page.pagination.totalPages).toBeGreaterThanOrEqual(0)
    for (const result of page.data) {
      expect(['note', 'page', 'post']).toContain(result.type)
      expect(typeof result.id).toBe('string')
      expect(typeof result.lang).toBe('string')
      expect(typeof result.isFallback).toBe('boolean')
    }
  }, 30_000)

  it('loads comments, embedded readers and thread replies through V5 methods', async () => {
    const posts = await apiClient.post.getList(1, 10)
    const post = posts.data.find((item) => item.id)
    expect(post).toBeDefined()
    if (!post) return

    const response = await apiClient.comment.getByRefId(post.id, {
      page: 1,
      size: 3,
      sort: 'newest',
    })
    const comments = normalizeCommentThreadPage(response, 1, 3)

    expect(comments.pagination.page).toBe(1)
    expect(comments.data.every((item) => item.refId === post.id)).toBe(true)
    const rootWithReplies = comments.data.find(
      (item) => item.replyWindow.total > item.replies.length,
    )
    if (!rootWithReplies) return

    const replies = await apiClient.comment.getThreadReplies(
      rootWithReplies.id,
      {
        cursor: rootWithReplies.replyWindow.nextCursor,
        size: 3,
      },
    )
    expect(replies).toBeDefined()
  }, 30_000)

  it.runIf(Boolean(process.env.CORE13_SHIRO_URL))(
    'serves Shiro RSS, Feed, Sitemap and OG against the live Core',
    async () => {
      const shiroUrl = process.env.CORE13_SHIRO_URL?.replace(/\/+$/, '')
      if (!shiroUrl) return
      const posts = await apiClient.post.getList(1, 1)
      const post = posts.data[0]
      expect(post).toBeDefined()
      if (!post) return

      const ogData = encodeURIComponent(
        JSON.stringify({
          category: post.category.slug,
          slug: post.slug,
          type: 'post',
        }),
      )
      const targets = [
        `${shiroUrl}/feed`,
        `${shiroUrl}/zh/says/feed`,
        `${shiroUrl}/zh/thinking/feed`,
        `${shiroUrl}/zh/sitemap`,
        `${shiroUrl}/zh/og?data=${ogData}`,
      ]
      const responses = await Promise.all(targets.map((url) => fetch(url)))

      expect(responses.every((response) => response.ok)).toBe(true)
      expect(responses[0]?.headers.get('Content-Type')).toContain('xml')
      expect(responses[3]?.headers.get('Content-Type')).toContain('xml')
      expect(responses[4]?.headers.get('Content-Type')).toContain('image')
    },
    60_000,
  )
})
