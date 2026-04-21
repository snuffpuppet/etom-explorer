import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

interface Note {
  id: string
  content: string
}

export function useNote(nodeId: string) {
  return useQuery({
    queryKey: ['notes', nodeId],
    queryFn: () => apiFetch<Note>(`/notes/${encodeURIComponent(nodeId)}`),
    staleTime: 0,
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nodeId, content }: { nodeId: string; content: string }) =>
      apiFetch<Note>(`/notes/${encodeURIComponent(nodeId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_data, { nodeId }) => {
      qc.invalidateQueries({ queryKey: ['notes', nodeId] })
    },
  })
}
