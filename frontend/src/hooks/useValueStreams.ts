import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

export interface ValueStream {
  id: string
  category: string
  name: string
  process_ids: string[]
}

export function useValueStreams() {
  return useQuery({
    queryKey: ['value-streams'],
    queryFn: () => apiFetch<ValueStream[]>('/value-streams'),
    staleTime: Infinity,
  })
}
