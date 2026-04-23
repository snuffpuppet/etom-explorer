import { useState } from 'react'
import type { ProcessNode } from '../types/process'
import type { Classification, Category, ReviewStatus } from '../types/classification'
import { CATEGORY_LABELS, REVIEW_STATUS_LABELS, CATEGORY_COLOURS } from '../types/classification'
import { useUpdateClassification, useUpsertDescoped } from '../hooks/useClassifications'

interface ClassificationPanelProps {
  node: ProcessNode
  classification: Classification | null
  onClose: () => void
}

const CATEGORY_DOT_COLOURS: Record<Category, string> = {
  oss:          'bg-green-500',
  oss_bss:      'bg-blue-500',
  bss:          'bg-orange-500',
  other:        'bg-gray-500',
  unclassified: 'bg-gray-600',
}

export function ClassificationPanel({ node, classification, onClose }: ClassificationPanelProps) {
  const [category, setCategory] = useState<Category>(classification?.category ?? 'unclassified')
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(classification?.review_status ?? 'unreviewed')
  const [notes, setNotes] = useState(classification?.notes ?? '')
  const [showDescopeForm, setShowDescopeForm] = useState(false)
  const [descopeReason, setDescopeReason] = useState('')

  const updateClassification = useUpdateClassification()
  const upsertDescoped = useUpsertDescoped()

  const handleSave = () => {
    updateClassification.mutate({ id: node.id, category, review_status: reviewStatus, notes })
    onClose()
  }

  const handleDescope = () => {
    upsertDescoped.mutate({ id: node.id, reason: descopeReason, notes })
    onClose()
  }

  const categories = Object.keys(CATEGORY_LABELS) as Category[]
  const reviewStatuses = Object.keys(REVIEW_STATUS_LABELS) as ReviewStatus[]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-gray-800 border border-gray-700 rounded-lg w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-3 truncate">{node.name}</h3>

        {/* Category radio buttons */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Category</p>
          <div className="space-y-1">
            {categories.map((cat) => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  checked={category === cat}
                  onChange={() => setCategory(cat)}
                  className="sr-only"
                />
                <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${CATEGORY_DOT_COLOURS[cat]} ${category === cat ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''}`} />
                <span className={`text-sm ${category === cat ? 'text-white' : 'text-gray-400'}`}>
                  {CATEGORY_LABELS[cat]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Review status dropdown */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Review Status</p>
          <select
            value={reviewStatus}
            onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {reviewStatuses.map((rs) => (
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
            rows={4}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Optional notes..."
          />
        </div>

        <hr className="border-gray-700 my-4" />

        {/* Descope form */}
        {showDescopeForm && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Descope Reason</p>
            <textarea
              value={descopeReason}
              onChange={(e) => setDescopeReason(e.target.value)}
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-red-500 resize-none"
              placeholder="Reason for descoping..."
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleDescope}
                disabled={!descopeReason.trim()}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs py-1.5 rounded transition-colors"
              >
                Confirm Descope
              </button>
              <button
                onClick={() => setShowDescopeForm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1.5 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showDescopeForm && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={updateClassification.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs py-1.5 rounded transition-colors"
            >
              Save Classification
            </button>
            <button
              onClick={() => setShowDescopeForm(true)}
              className="flex-1 bg-gray-700 hover:bg-red-900/60 text-gray-300 text-xs py-1.5 rounded transition-colors border border-gray-600"
            >
              Mark Descoped
            </button>
          </div>
        )}
      </div>
      </div>
    </>
  )
}

// Re-export CATEGORY_COLOURS for convenience (used in ProcessTile)
export { CATEGORY_COLOURS }
