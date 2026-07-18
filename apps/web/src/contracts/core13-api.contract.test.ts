import createClient, {
  allControllers,
  CollectionRefTypes,
  metaFor,
} from '@mx-space/api-client'
import { fetchAdaptor } from '@mx-space/api-client/dist/adaptors/fetch'
import { afterEach, describe, expect, it, vi } from 'vitest'

const endpoint = 'https://core.example/api/v3'
const snowflakeId = '9223372036854775807'
const createdAt = '2026-07-17T00:00:00.000Z'

const pagination = {
  hasNextPage: false,
  hasPrevPage: false,
  page: 1,
  size: 10,
  total: 1,
  totalPages: 1,
}

const category = {
  createdAt,
  id: '9223372036854775701',
  name: 'TypeScript',
  slug: 'typescript',
  type: 0,
}

const post = {
  category,
  categoryId: category.id,
  contentFormat: 'markdown',
  createdAt,
  id: snowflakeId,
  isPublished: true,
  likeCount: 2,
  modifiedAt: null,
  readCount: 12,
  slug: 'core-13',
  summary: 'Core 13 contract fixture',
  text: '# Core 13',
  title: 'Core 13',
}

const note = {
  bookmark: false,
  contentFormat: 'markdown',
  createdAt,
  hasPassword: false,
  id: '9223372036854775806',
  isPublished: true,
  likeCount: 1,
  modifiedAt: null,
  nid: 13,
  readCount: 8,
  text: 'A Core 13 note',
  title: 'Core 13 note',
}

const page = {
  contentFormat: 'markdown',
  createdAt,
  id: '9223372036854775805',
  modifiedAt: null,
  order: 1,
  slug: 'about',
  text: 'About',
  title: 'About',
}

type CoreEnvelope = {
  data: unknown
  meta?: Record<string, unknown>
}

const createMockedClient = (responses: readonly CoreEnvelope[]) => {
  const queue = [...responses]
  const requests: string[] = []
  const requestDetails: Array<{
    body: unknown
    method: string
    url: string
  }> = []
  const fetchMock: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push(request.url)
    requestDetails.push({
      body:
        request.method === 'GET'
          ? null
          : await request
              .clone()
              .json()
              .catch(() => null),
      method: request.method,
      url: request.url,
    })
    const response = queue.shift()
    if (!response) throw new Error('Unexpected Core API request')

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  vi.stubGlobal('fetch', fetchMock)

  return {
    client: createClient(fetchAdaptor)(endpoint, {
      controllers: allControllers,
    }),
    requestDetails,
    requests,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Mix Space Core 13 V3 API contract', () => {
  it('parses aggregate and page list independently from native envelopes', async () => {
    const aggregate = {
      commentOptions: { allowGuestComment: true, disableComment: false },
      latestNoteId: { id: note.id, nid: note.nid },
      seo: { description: 'A Core 13 site', title: 'Shiro' },
      theme: { config: { footer: { otherInfo: 'Core 13' } } },
      url: {
        serverUrl: 'https://core.example',
        webUrl: 'https://shiro.example',
        wsUrl: 'https://core.example',
      },
      user: { id: '9223372036854775700', name: 'Owner', socialIds: {} },
    }
    const { client, requests } = createMockedClient([
      { data: aggregate },
      { data: [page], meta: { pagination } },
    ])

    const [aggregateResult, pageResult] = await Promise.all([
      client.aggregate.getAggregateData('shiro'),
      client.page.getList(1, 100),
    ])

    expect(aggregateResult.user.id).toBe('9223372036854775700')
    expect(Reflect.has(aggregateResult, 'pageMeta')).toBe(false)
    expect(pageResult.data[0]).toMatchObject({
      createdAt,
      id: page.id,
      modifiedAt: null,
      slug: 'about',
    })
    expect(pageResult.pagination).toMatchObject({ page: 1, totalPages: 1 })
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/api/v3/aggregate'),
        expect.stringContaining('/api/v3/pages'),
      ]),
    )
  })

  it('parses post list and detail metadata without a legacy adapter', async () => {
    const interaction = { isLiked: true, likeCount: 3, readCount: 13 }
    const { client } = createMockedClient([
      { data: [post], meta: { pagination } },
      {
        data: post,
        meta: {
          interaction: { [post.id]: interaction },
          translation: {
            [post.id]: {
              article: { title: 'Core 13 translated' },
              fields: ['title'],
            },
          },
        },
      },
    ])

    const list = await client.post.getList(1, 10, { lang: 'zh-CN' })
    const detail = await client.post.getPost('typescript', 'core-13', {
      lang: 'zh-CN',
    })

    expect(list.data[0]?.id).toBe(snowflakeId)
    expect(typeof list.data[0]?.id).toBe('string')
    expect(list.data[0]).not.toHaveProperty('created')
    expect(list.pagination.totalPages).toBe(1)
    expect(metaFor(detail, detail.$meta)).toMatchObject({ interaction })
  })

  it('parses note and page lists and details using string IDs', async () => {
    const { client } = createMockedClient([
      { data: [note], meta: { pagination } },
      { data: { ...note, next: null, prev: null } },
      { data: [page], meta: { pagination } },
      { data: page },
    ])

    const noteList = await client.note.getList(1, 10, { withSummary: true })
    const noteDetail = await client.note.getNoteByNid(note.nid, {
      lang: 'en',
      single: false,
    })
    const pageList = await client.page.getList(1, 10)
    const pageDetail = await client.page.getBySlug(page.slug)

    expect(noteList.data[0]).toMatchObject({
      createdAt,
      id: note.id,
      nid: 13,
      readCount: 8,
    })
    expect(noteDetail).toMatchObject({ id: note.id, next: null, prev: null })
    expect(pageList.pagination).toEqual(pagination)
    expect(pageDetail.id).toBe(page.id)
    expect(typeof pageDetail.id).toBe('string')
  })

  it('parses local search results and V3 pagination', async () => {
    const results = [
      {
        ...post,
        highlight: { keywords: ['Core'], snippet: '<mark>Core</mark> 13' },
        isFallback: false,
        lang: 'zh-CN',
        type: 'post',
      },
      {
        ...note,
        highlight: { keywords: ['Core'], snippet: null },
        isFallback: true,
        lang: 'en',
        type: 'note',
      },
      {
        ...page,
        highlight: { keywords: ['Core'], snippet: 'About Core' },
        isFallback: false,
        lang: 'zh-CN',
        type: 'page',
      },
    ]
    const searchPagination = { ...pagination, size: 20, total: 3 }
    const { client, requests } = createMockedClient([
      { data: results, meta: { pagination: searchPagination } },
    ])

    const result = await client.search.searchAll('Core', {
      lang: 'zh-CN',
    })

    expect(result.data.map((item) => item.type)).toEqual([
      'post',
      'note',
      'page',
    ])
    expect(result.data[1]).toMatchObject({ isFallback: true, lang: 'en' })
    expect(result.pagination).toMatchObject({
      page: 1,
      total: 3,
      totalPages: 1,
    })
    expect(requests[0]).toContain('/api/v3/search')
    expect(requests[0]).not.toContain('algolia')
  })

  it('uses the V5 comment list, thread, guest and reader endpoints', async () => {
    const refId = post.id
    const rootId = '9223372036854775601'
    const replyId = '9223372036854775602'
    const rootComment = {
      agent: null,
      anchor: null,
      authProvider: null,
      author: 'Guest',
      avatar: null,
      createdAt,
      deletedAt: null,
      editedAt: null,
      id: rootId,
      ip: null,
      isDeleted: false,
      isWhispers: false,
      latestReplyAt: null,
      location: null,
      parentCommentId: null,
      pin: false,
      readerId: null,
      refId,
      refType: CollectionRefTypes.Post,
      replyCount: 1,
      rootCommentId: null,
      state: 1,
      text: 'Core 13 comment',
      url: null,
    }
    const reply = {
      ...rootComment,
      id: replyId,
      parentCommentId: rootId,
      rootCommentId: rootId,
      text: 'Core 13 reply',
    }
    const responses = [
      {
        data: {
          data: [{ ...rootComment, replies: [reply], replyWindow: null }],
          pagination,
          readers: {},
        },
      },
      {
        data: {
          done: true,
          nextCursor: null,
          remaining: 0,
          replies: [reply],
        },
      },
      { data: rootComment },
      { data: reply },
      { data: rootComment },
      { data: reply },
    ] as const
    const { client, requestDetails } = createMockedClient(responses)

    const comments = await client.comment.getByRefId(refId, {
      page: 1,
      size: 10,
      sort: 'newest',
    })
    const replies = await client.comment.getThreadReplies(rootId, {
      cursor: 'cursor-1',
      size: 10,
    })
    await client.comment.guestComment(refId, {
      author: 'Guest',
      mail: 'guest@example.com',
      text: 'Core 13 comment',
    })
    await client.comment.guestReply(rootId, {
      author: 'Guest',
      mail: 'guest@example.com',
      text: 'Core 13 reply',
    })
    await client.comment.readerComment(refId, { text: 'Reader comment' })
    await client.comment.readerReply(rootId, { text: 'Reader reply' })

    expect(comments.data[0]?.refId).toBe(refId)
    expect(replies.replies[0]?.rootCommentId).toBe(rootId)
    expect(
      requestDetails.map(({ method, url }) => ({
        method,
        path: new URL(url).pathname,
      })),
    ).toEqual([
      { method: 'GET', path: `/api/v3/comments/ref/${refId}` },
      { method: 'GET', path: `/api/v3/comments/thread/${rootId}` },
      { method: 'POST', path: `/api/v3/comments/guest/${refId}` },
      { method: 'POST', path: `/api/v3/comments/guest/reply/${rootId}` },
      { method: 'POST', path: `/api/v3/comments/reader/${refId}` },
      { method: 'POST', path: `/api/v3/comments/reader/reply/${rootId}` },
    ])
    expect(requestDetails[2]?.body).toMatchObject({
      author: 'Guest',
      mail: 'guest@example.com',
      text: 'Core 13 comment',
    })
    expect(requestDetails[4]?.body).toEqual({ text: 'Reader comment' })
  })
})
