import { describe, expect, it } from 'vitest'

import { normalizeCoreSearchPage } from './search'

describe('Core 13 search response normalization', () => {
  it('normalizes the nested Core 13.14.1 search payload', () => {
    const result = normalizeCoreSearchPage<{ id: string }>({
      $serialized: {
        data: {
          data: [{ id: '9223372036854775807' }],
          pagination: {
            currentPage: 2,
            hasNextPage: true,
            hasPrevPage: true,
            size: 20,
            total: 41,
            totalPage: 3,
          },
        },
      },
    })

    expect(result).toEqual({
      data: [{ id: '9223372036854775807' }],
      pagination: {
        hasNextPage: true,
        hasPrevPage: true,
        page: 2,
        size: 20,
        total: 41,
        totalPages: 3,
      },
    })
  })

  it('accepts the native V3 pagination shape declared by API Client 5', () => {
    const result = normalizeCoreSearchPage<{ id: string }>({
      data: [{ id: 'content-id' }],
      pagination: { page: 1, size: 10, total: 1, totalPages: 1 },
    })

    expect(result.pagination).toMatchObject({
      hasNextPage: false,
      hasPrevPage: false,
      page: 1,
      totalPages: 1,
    })
  })
})
