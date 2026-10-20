import { defaultThemeConfig } from '~/app.default.theme-config'
import { appStaticConfig } from '~/app.static.config'
import { attachServerFetch } from '~/lib/attach-fetch'
import { deepMerge } from '~/lib/lodash'
import { getQueryClient } from '~/lib/query-client.server'
import { apiClient } from '~/lib/request'
import type { SiteRootData } from '~/types/site'

const cacheTime = appStaticConfig.cache.enabled
  ? appStaticConfig.cache.ttl.aggregation
  : 1

export const fetchOwnerAuth = () =>
  apiClient.owner
    .checkTokenValid()
    .then(({ ok }) => !!ok)
    .catch(() => false)

export const fetchAggregationData = async () => {
  await attachServerFetch()
  const queryClient = getQueryClient()

  const [aggregationData, pages] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: ['aggregate', 'shiro'],
      queryFn: async () =>
        (await apiClient.aggregate.getAggregateData<AppThemeConfig>('shiro'))
          .$serialized,
      staleTime: cacheTime,
      gcTime: cacheTime,
    }),
    queryClient.fetchQuery({
      queryKey: ['pages', 'navigation'],
      queryFn: async () =>
        (await apiClient.page.getList(1, 100)).$serialized.data,
      staleTime: cacheTime,
      gcTime: cacheTime,
    }),
  ])

  return {
    ...aggregationData,
    pages,
    theme: aggregationData.theme
      ? deepMerge(defaultThemeConfig, aggregationData.theme)
      : defaultThemeConfig,
  } satisfies SiteRootData
}
