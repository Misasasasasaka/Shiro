import type { AggregateTop } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'

export const queryKey = ['home']

type AggregateTopWithProtectedNotes = Omit<AggregateTop, 'notes'> & {
  notes: Array<
    AggregateTop['notes'][number] & {
      hasPassword?: boolean
    }
  >
}

export const useHomeQueryData = () =>
  useQuery({
    queryKey,
    queryFn: async () => null! as AggregateTopWithProtectedNotes,
    enabled: false,
  }).data!
