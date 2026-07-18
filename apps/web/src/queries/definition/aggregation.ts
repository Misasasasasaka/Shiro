import { isServer } from '@tanstack/react-query'

import { apiClient } from '~/lib/request'

import { defineQuery } from '../helper'

export const aggregation = {
  root: () =>
    defineQuery({
      queryKey: ['aggregation'],
      queryFn: async () =>
        (await apiClient.aggregate.getAggregateData<AppThemeConfig>('shiro'))
          .$serialized,
      gcTime: 1000 * 60 * 10,
      staleTime: isServer ? 1000 * 60 * 10 : undefined,
    }),
  pages: () =>
    defineQuery({
      queryKey: ['pages', 'navigation'],
      queryFn: async () =>
        (await apiClient.page.getList(1, 100)).$serialized.data,
      gcTime: 1000 * 60 * 10,
      staleTime: isServer ? 1000 * 60 * 10 : undefined,
    }),
}
