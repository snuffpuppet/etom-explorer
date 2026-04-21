import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { ProcessNode } from '../types/process'

export function useProcessTree() {
  return useQuery({
    queryKey: ['process-tree'],
    queryFn: () => apiFetch<ProcessNode[]>('/processes'),
    staleTime: Infinity,
  })
}
