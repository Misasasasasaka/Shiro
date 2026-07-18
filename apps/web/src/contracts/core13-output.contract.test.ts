import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET as getOgImage } from '~/app/[locale]/og/route'
import { GET as getSaysFeed } from '~/app/[locale]/says/feed/route'
import { GET as getSitemap } from '~/app/[locale]/sitemap/route'
import { GET as getThinkingFeed } from '~/app/[locale]/thinking/feed/route'
import { GET as getFeed } from '~/app/feed/route'
import { mxSpacePlugin } from '~/components/ui/link-card/plugins/self/mx-space'

const fixture = vi.hoisted(() => {
  const createdAt = '2026-07-17T00:00:00.000Z'
  const post = {
    category: { name: 'TypeScript', slug: 'typescript' },
    createdAt,
    id: '9223372036854775807',
    images: [],
    slug: 'core-13',
    summary: 'Core 13 post summary',
    text: '# Core 13',
    title: 'Core 13 post',
  }
  const note = {
    createdAt,
    id: '9223372036854775806',
    images: [],
    nid: 13,
    summary: 'Core 13 note summary',
    text: 'Core 13 note',
    title: 'Core 13 note',
  }
  const page = {
    createdAt,
    id: '9223372036854775805',
    slug: 'about',
    subtitle: 'About this site',
    text: 'About',
    title: 'About',
  }
  const aggregate = {
    latestNoteId: { id: note.id, nid: note.nid },
    seo: { description: 'A Core 13 site', title: 'Shiro' },
    theme: {
      config: {
        module: {
          og: { avatar: '' },
          rss: { custom_elements: [], noRSS: true },
        },
        site: { favicon: '/favicon.ico' },
      },
    },
    url: {
      serverUrl: 'https://core.example',
      webUrl: 'https://shiro.example',
      wsUrl: 'https://core.example',
    },
    user: {
      avatar: 'https://shiro.example/avatar.png',
      id: '9223372036854775700',
      name: 'Owner',
      socialIds: {},
    },
  }

  return {
    aggregate,
    createdAt,
    feedGet: vi.fn(async () => ({
      author: 'Owner',
      data: [
        {
          createdAt,
          id: post.id,
          images: [],
          link: 'https://shiro.example/posts/typescript/core-13',
          modifiedAt: null,
          text: post.text,
          title: post.title,
        },
      ],
      url: 'https://shiro.example',
    })),
    getAggregate: vi.fn(async () => aggregate),
    getNote: vi.fn(async () => note),
    getPage: vi.fn(async () => page),
    getPost: vi.fn(async () => post),
    note,
    page,
    post,
    recentlyGetList: vi.fn(async () => ({
      $serialized: [
        {
          allowComment: true,
          content: 'Core 13 thinking',
          createdAt,
          id: '9223372036854775804',
          ref: null,
        },
      ],
    })),
    saysGetList: vi.fn(async () => ({
      data: [
        {
          author: 'Owner',
          createdAt,
          id: '9223372036854775803',
          source: null,
          text: 'Core 13 says hello',
        },
      ],
    })),
    sitemapGet: vi.fn(async () => [
      {
        publishedAt: createdAt,
        url: 'https://shiro.example/posts/typescript/core-13',
      },
      {
        publishedAt: null,
        url: 'https://shiro.example/notes/13',
      },
    ]),
  }
})

const apiClientMock = vi.hoisted(() => ({
  aggregate: {
    getAggregateData: fixture.getAggregate,
    getSiteMetadata: fixture.getAggregate,
    proxy: {
      feed: { get: fixture.feedGet },
      sitemap: { get: fixture.sitemapGet },
    },
  },
  note: { getNoteByNid: fixture.getNote },
  page: { getBySlug: fixture.getPage },
  post: { getPost: fixture.getPost },
  recently: { getList: fixture.recentlyGetList },
  say: { getAllPaginated: fixture.saysGetList },
}))

vi.mock('~/lib/request', () => ({ apiClient: apiClientMock }))
vi.mock('~/lib/query-client.server', () => ({
  getQueryClient: () => ({
    fetchQuery: async (options: { queryFn: () => Promise<unknown> }) =>
      options.queryFn(),
  }),
}))
vi.mock('~/atoms', () => ({
  getWebUrl: () => 'https://shiro.example',
}))
vi.mock('~/lib/image', () => ({
  getDominantColor: () => '#ffffff',
}))
vi.mock('server-only', () => ({}))
vi.mock('~/components/ui/markdown/parsers/container', () => ({
  ContainerRule: {},
}))
vi.mock('~/components/ui/markdown/parsers/ins', () => ({ InsertRule: {} }))
vi.mock('~/components/ui/markdown/parsers/mention', () => ({ MentionRule: {} }))
vi.mock('~/components/ui/markdown/parsers/spoiler', () => ({ SpoilerRule: {} }))
vi.mock('next/og', () => ({
  ImageResponse: class extends Response {
    constructor() {
      super('Core 13 OG image', {
        headers: { 'Content-Type': 'image/png' },
        status: 200,
      })
    }
  },
}))
vi.mock('@mx-space/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mx-space/api-client')>()
  return {
    ...actual,
    createClient: () => () => apiClientMock,
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Core 13 generated output contracts', () => {
  it('renders the main RSS feed from createdAt and native string IDs', async () => {
    const response = await getFeed()
    const xml = await response.text()

    expect(response.headers.get('Content-Type')).toBe('application/xml')
    expect(xml).toContain('<title><![CDATA[Core 13 post]]></title>')
    expect(xml).toContain('<guid isPermaLink="true">')
    expect(xml).toContain('Fri, 17 Jul 2026 00:00:00 GMT')
    expect(xml).not.toContain('Invalid Date')
  })

  it('renders says and thinking feeds with Core 13 timestamps', async () => {
    const [saysResponse, thinkingResponse] = await Promise.all([
      getSaysFeed(),
      getThinkingFeed(),
    ])
    const [saysXml, thinkingXml] = await Promise.all([
      saysResponse.text(),
      thinkingResponse.text(),
    ])

    expect(saysXml).toContain('9223372036854775803')
    expect(saysXml).toContain('Core 13 says hello')
    expect(thinkingXml).toContain('9223372036854775804')
    expect(thinkingXml).toContain('Core 13 thinking')
    expect(saysXml).not.toContain('Invalid Date')
    expect(thinkingXml).not.toContain('Invalid Date')
  })

  it('renders sitemap lastmod and localized alternates from V3 entries', async () => {
    const response = await getSitemap()
    const xml = await response.text()

    expect(xml).toContain('<lastmod>2026-07-17T00:00:00.000Z</lastmod>')
    expect(xml).toContain('hreflang="zh-CN"')
    expect(xml).toContain('hreflang="en"')
    expect(xml).toContain('hreflang="x-default"')
    expect(xml).not.toContain('[object Object]')
  })

  it.each([
    {
      data: { category: 'typescript', slug: 'core-13', type: 'post' },
      expected: 'Core 13 post',
    },
    { data: { nid: 13, type: 'note' }, expected: 'Core 13 note' },
    { data: { slug: 'about', type: 'page' }, expected: 'About' },
  ])(
    'resolves $data.type OG data directly from V3 models',
    async ({ data }) => {
      const encoded = encodeURIComponent(JSON.stringify(data))
      const request = {
        nextUrl: new URL(`https://shiro.example/zh/og?data=${encoded}`),
      } as NextRequest
      const response = await getOgImage(request, {
        params: Promise.resolve({ locale: 'zh' }),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/png')
    },
  )

  it('builds internal post and note cards from native detail models', async () => {
    expect(
      mxSpacePlugin.matchUrl(
        new URL('https://shiro.example/posts/typescript/core-13'),
      ),
    ).toMatchObject({ id: 'posts/typescript/core-13' })

    const [postCard, noteCard] = await Promise.all([
      mxSpacePlugin.fetch('posts/typescript/core-13'),
      mxSpacePlugin.fetch('notes/13'),
    ])

    expect(postCard).toMatchObject({
      desc: 'Core 13 post summary',
      title: 'Core 13 post',
    })
    expect(noteCard).toMatchObject({
      desc: 'Core 13 note summary',
      title: 'Core 13 note',
    })
    expect(fixture.getNote).toHaveBeenCalledWith(13)
  })
})
