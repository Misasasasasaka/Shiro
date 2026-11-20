import type {
  RecentlyAttitudeEnum,
  RecentlyAttitudeResultEnum,
  RecentlyModel,
} from '@mx-space/api-client'

import { apiClient } from '~/lib/request'

export const submitRecentlyAttitude = (
  id: string,
  attitude: RecentlyAttitudeEnum,
) =>
  apiClient.recently.proxy.attitude(id).post<{
    code: RecentlyAttitudeResultEnum
  }>({ params: { attitude } })

export const getRecentlyAttitudeCounts = async (id: string) => {
  // Core skips its API response cache when the request has a timestamp.
  const { up, down } = await apiClient.recently
    .proxy(id)
    .get<Pick<RecentlyModel, 'up' | 'down'>>({ params: { ts: Date.now() } })
  return { up, down }
}
