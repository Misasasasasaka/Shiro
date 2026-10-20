import { simpleCamelcaseKeys } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { nanoid } from 'nanoid'
import { useEffect } from 'react'

import { fetchAppUrl } from '~/atoms'
import { setIsOwnerLogged } from '~/atoms/hooks/owner'
import { setSessionReader } from '~/atoms/hooks/reader'
import { apiClient } from '~/lib/request'
import type { SessionReader } from '~/models/session'

type AdapterUser = SessionReader & { role?: 'owner' | 'reader' }
export const AuthSessionProvider: Component = ({ children }) => {
  const { data: session } = useQuery({
    queryKey: ['session'],
    refetchOnMount: 'always',
    queryFn: () =>
      apiClient.proxy.auth.session.get<AdapterUser | null>({
        params: {
          r: nanoid(),
        },
      }),
  })
  useEffect(() => {
    // Preserve the server's auth result until the session request completes.
    if (session === undefined) return
    setIsOwnerLogged(session?.role === 'owner')
    if (!session) {
      setSessionReader(null)
      return
    }
    const transformedData = simpleCamelcaseKeys(session)

    setSessionReader(transformedData)
    if (transformedData.role === 'owner') {
      fetchAppUrl()
    }
  }, [session])
  return children
}
