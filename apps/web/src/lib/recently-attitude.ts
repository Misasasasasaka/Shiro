import type {
  RecentlyAttitudeEnum,
  RecentlyAttitudeResultEnum,
} from '@mx-space/api-client'

import { apiClient } from '~/lib/request'

export const submitRecentlyAttitude = (
  id: string,
  attitude: RecentlyAttitudeEnum,
) =>
  apiClient.recently.proxy.attitude(id).post<{
    code: RecentlyAttitudeResultEnum
  }>({ params: { attitude } })
