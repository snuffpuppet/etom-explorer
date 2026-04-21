import { useState } from 'react'
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../hooks/useTags'
import type { TagDef } from '../types/tags'

const PRESET_COLOURS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

interface TagFormProps {
  initial?: TagDef
  onSave: (data: { name: string; colour: string; description: string }) => void
  onCancel: () => void
}

function TagForm({ initial, onSave, onCancel }: TagFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [colour, setColour] = useState(initial?.colour ?? PRESET_COLOURS[0])
  const [description, setDescription] = useState(initial?.description ?? '')

  return (
    <div className="bg-gray-800 rounded p-3 flex flex-col gap-2 border border-gray-700">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tag name"
        className="bg-gray-900 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-600"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="bg-gray-900 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-600"
      />
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESET_COLOURS.map((c) => (
          <button
            key={c}
            onClick={() => setColour(c)}
            className="w-5 h-5 rounded-full border-2 transition-transform"
            style={{
              backgroundColor: c,
              borderColor: colour === c ? 'white' : 'transparent',
              transform: colour === c ? 'scale(1.2)' : undefined,
            }}
          />
        ))}
        <input
          type="color"
          value={colour}
          onChange={(e) => setColour(e.target.value)}
          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
          title="Custom colour"
        />
      </div>
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => name.trim() && onSave({ name: name.trim(), colour, description: description.trim() })}
          disabled={!name.trim()}
          className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-1 rounded"
        >
          Save
        </button>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-white px-2 py-1">
          Cancel
        </button>
      </div>
    </div>
  )
}

interface TagManagerProps {
  onClose: () => void
}

export function TagManager({ onClose }: TagManagerProps) {
  const { data: tags = [] } = useTags()
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-white font-semibold">Tag Definitions</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {tags.map((tag) =>
            editingId === tag.id ? (
              <TagForm
                key={tag.id}
                initial={tag}
                onSave={(data) => {
                  updateTag.mutate({ id: tag.id, ...data })
                  setEditingId(null)
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={tag.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded border border-gray-700"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.colour }}
                />
                <span className="text-sm text-white flex-1">{tag.name}</span>
                {tag.description && (
                  <span className="text-xs text-gray-500 truncate max-w-[120px]">{tag.description}</span>
                )}
                <button
                  onClick={() => setEditingId(tag.id)}
                  className="text-gray-500 hover:text-white text-xs ml-auto"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteTag.mutate(tag.id)}
                  className="text-gray-600 hover:text-red-400 text-xs"
                >
                  Delete
                </button>
              </div>
            )
          )}

          {tags.length === 0 && !adding && (
            <p className="text-sm text-gray-500 text-center py-4">No tags yet. Create one below.</p>
          )}

          {adding && (
            <TagForm
              onSave={(data) => {
                createTag.mutate(data)
                setAdding(false)
              }}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>

        {!adding && (
          <div className="px-4 py-3 border-t border-gray-700">
            <button
              onClick={() => setAdding(true)}
              className="text-sm bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-600 w-full"
            >
              + New Tag
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
