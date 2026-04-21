import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { Classification, DescopedEntry } from '../types/classification'

export function useClassifications() {
  return useQuery({
    queryKey: ['classifications'],
    queryFn: () => apiFetch<Classification[]>('/classifications'),
    staleTime: 0,
  })
}

export function useDescoped() {
  return useQuery({
    queryKey: ['descoped'],
    queryFn: () => apiFetch<DescopedEntry[]>('/descoped'),
    staleTime: 0,
  })
}

export function useUpdateClassification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; category: string; review_status: string; notes: string }) =>
      apiFetch<Classification>(`/classifications/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classifications'] }),
  })
}

export function useUpsertDescoped() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason, notes }: { id: string; reason: string; notes: string }) =>
      apiFetch<DescopedEntry>(`/descoped/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, notes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['descoped'] })
      qc.invalidateQueries({ queryKey: ['classifications'] })
    },
  })
}

export function useRemoveDescoped() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/descoped/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['descoped'] }),
  })
}
