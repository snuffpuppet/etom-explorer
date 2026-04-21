import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { TagDef, TagAssignment, TeamAssignment, SearchResult } from '../types/tags'

// ── Tag definitions ──────────────────────────────────────────────────────────

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiFetch<TagDef[]>('/tags'),
    staleTime: 0,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; colour: string; description: string }) =>
      apiFetch<TagDef>('/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name: string; colour: string; description: string }) =>
      apiFetch<TagDef>(`/tags/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/tags/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['tag-assignments'] })
    },
  })
}

// ── Tag assignments ───────────────────────────────────────────────────────────

export function useTagAssignments() {
  return useQuery({
    queryKey: ['tag-assignments'],
    queryFn: () => apiFetch<TagAssignment[]>('/tags/assignments'),
    staleTime: 0,
  })
}

export function useUpdateNodeTags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nodeId, assignments }: { nodeId: string; assignments: { tag_id: string; cascade: boolean }[] }) =>
      apiFetch<TagAssignment[]>(`/tags/assignments/${encodeURIComponent(nodeId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tag-assignments'] }),
  })
}

// ── Team assignments ──────────────────────────────────────────────────────────

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => apiFetch<TeamAssignment[]>('/teams'),
    staleTime: 0,
  })
}

export function useUpdateNodeTeams() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nodeId, assignments }: { nodeId: string; assignments: { team: string; function: string }[] }) =>
      apiFetch<TeamAssignment[]>(`/teams/${encodeURIComponent(nodeId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  })
}

// ── Search ────────────────────────────────────────────────────────────────────

export function useSearch(q: string) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => apiFetch<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
    staleTime: 30_000,
  })
}
