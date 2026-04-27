import { useState, useEffect } from 'react'
import type { ProcessNode } from '../types/process'
import type { Classification, ScopeStatus, ReviewStatus } from '../types/classification'
import { SCOPE_STATUS_LABELS, SCOPE_STATUS_DOT, SCOPE_STATUS_BORDER, SCOPE_STATUSES, REVIEW_STATUS_LABELS, REVIEW_STATUSES, SCOPE_STATUS_BG } from '../types/classification'
import { useUpdateClassification } from '../hooks/useClassifications'
import { useTags, useTagAssignments, useUpdateNodeTags } from '../hooks/useTags'

interface ClassificationPanelProps {
  node: ProcessNode
  classification: Classification | null
  onClose: () => void
}

export function ClassificationPanel({ node, classification, onClose }: ClassificationPanelProps) {
  const [scopeStatus, setScopeStatus] = useState<ScopeStatus>(classification?.scope_status ?? 'tbd')
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(classification?.review_status ?? 'unreviewed')
  const [reason, setReason] = useState(classification?.reason ?? '')
  const [notes, setNotes] = useState(classification?.notes ?? '')

  const { data: tagDefs = [] } = useTags()
  const { data: allAssignments = [] } = useTagAssignments()
  const nodeAssignments = allAssignments.filter((a) => a.node_id === node.id)
  const [selectedTags, setSelectedTags] = useState<{ tag_id: string; cascade: boolean }[]>(
    nodeAssignments.map((a) => ({ tag_id: a.tag_id, cascade: a.cascade === 'true' }))
  )

  useEffect(() => {
    const assignments = allAssignments.filter((a) => a.node_id === node.id)
    if (assignments.length > 0) {
      setSelectedTags(assignments.map((a) => ({ tag_id: a.tag_id, cascade: a.cascade === 'true' })))
    }
  }, [allAssignments, node.id])

  const updateClassification = useUpdateClassification()
  const updateNodeTags = useUpdateNodeTags()

  const handleSave = () => {
    updateClassification.mutate({ id: node.id, scope_status: scopeStatus, review_status: reviewStatus, reason, notes })
    updateNodeTags.mutate({ nodeId: node.id, assignments: selectedTags })
    onClose()
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) => {
      const exists = prev.find((t) => t.tag_id === tagId)
      return exists ? prev.filter((t) => t.tag_id !== tagId) : [...prev, { tag_id: tagId, cascade: false }]
    })
  }

  function toggleCascade(tagId: string) {
    setSelectedTags((prev) =>
      prev.map((t) => t.tag_id === tagId ? { ...t, cascade: !t.cascade } : t)
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto bg-gray-800 border border-gray-700 rounded-lg w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4 truncate">{node.name}</h3>

          {/* Scope status */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Scope</p>
            <div className="space-y-1">
              {SCOPE_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope_status"
                    value={s}
                    checked={scopeStatus === s}
                    onChange={() => setScopeStatus(s)}
                    className="sr-only"
                  />
                  <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${SCOPE_STATUS_DOT[s]} ${scopeStatus === s ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''}`} />
                  <span className={`text-sm ${scopeStatus === s ? 'text-white' : 'text-gray-400'}`}>
                    {SCOPE_STATUS_LABELS[s]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Reason <span className="normal-case text-gray-600">(optional)</span></p>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this scope decision…"
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Review status */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Review Status</p>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {REVIEW_STATUSES.map((rs) => (
                <option key={rs} value={rs}>{REVIEW_STATUS_LABELS[rs]}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Optional notes…"
            />
          </div>

          <hr className="border-gray-700 my-4" />

          {/* Tags */}
          {tagDefs.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tagDefs.map((tag) => {
                  const selected = selectedTags.find((t) => t.tag_id === tag.id)
                  const cascade = selected?.cascade ?? false
                  return (
                    <div key={tag.id} className="flex items-center gap-1">
                      <button
                        onClick={() => toggleTag(tag.id)}
                        className="text-xs px-2 py-0.5 rounded border transition-colors"
                        style={{
                          borderColor: tag.colour,
                          color: selected ? 'white' : tag.colour + 'cc',
                          backgroundColor: selected ? tag.colour + '33' : undefined,
                        }}
                      >
                        {tag.name}
                      </button>
                      {selected && (
                        <button
                          onClick={() => toggleCascade(tag.id)}
                          className={`text-xs px-1 py-0.5 rounded border ${cascade ? 'border-gray-400 text-gray-300' : 'border-gray-700 text-gray-600'}`}
                          title="Cascade to children"
                        >
                          ↓
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={updateClassification.isPending}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs py-1.5 rounded transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
}

// Re-export for ProcessTile (border colour lookup)
export { SCOPE_STATUS_BORDER as CLASSIFICATION_BORDER_COLOURS }
