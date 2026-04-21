import { useState, useEffect, useRef } from 'react'
import { useNote, useUpdateNote } from '../hooks/useNotes'

interface NotesEditorProps {
  nodeId: string
}

export function NotesEditor({ nodeId }: NotesEditorProps) {
  const { data } = useNote(nodeId)
  const updateNote = useUpdateNote()

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [text, setText] = useState('')
  const [saveLabel, setSaveLabel] = useState<'Save' | 'Saving...' | 'Saved'>('Save')

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // Sync textarea when server data loads or nodeId changes
  useEffect(() => {
    setText(data?.content ?? '')
  }, [data?.content, nodeId])

  function handleSave() {
    setSaveLabel('Saving...')
    updateNote.mutate(
      { nodeId, content: text },
      {
        onSuccess: () => {
          setSaveLabel('Saved')
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => setSaveLabel('Save'), 2000)
        },
        onError: () => {
          setSaveLabel('Save')
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-gray-600"
        placeholder="Add notes for this process…"
      />
      <div>
        <button
          onClick={handleSave}
          disabled={saveLabel === 'Saving...'}
          className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1 rounded"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  )
}
