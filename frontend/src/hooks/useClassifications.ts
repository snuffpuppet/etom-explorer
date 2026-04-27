import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { Classification } from '../types/classification'

export function useClassifications() {
  return useQuery({
    queryKey: ['classifications'],
    queryFn: () => apiFetch<Classification[]>('/classifications'),
    staleTime: 0,
  })
}

export function useUpdateClassification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      scope_status,
      review_status,
      reason,
      notes,
    }: {
      id: string
      scope_status: string
      review_status: string
      reason: string
      notes: string
    }) =>
      apiFetch<Classification>(`/classifications/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope_status, review_status, reason, notes }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classifications'] }),
  })
}
