import { useState, useRef, useEffect } from 'react'
import type { Classification, ScopeStatus } from '../types/classification'
import { SCOPE_STATUS_LABELS, SCOPE_STATUS_BG, SCOPE_STATUS_DOT, SCOPE_STATUSES } from '../types/classification'
import { useUpdateClassification } from '../hooks/useClassifications'
import type { ProcessNode } from '../types/process'

interface ScopeDropdownProps {
  node: ProcessNode
  classification: Classification | null
}

export function ScopeDropdown({ node, classification }: ScopeDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const updateClassification = useUpdateClassification()
  const current = classification?.scope_status ?? 'tbd'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleSelect(status: ScopeStatus) {
    updateClassification.mutate({
      id: node.id,
      scope_status: status,
      review_status: classification?.review_status ?? 'unreviewed',
      reason: classification?.reason ?? '',
      notes: classification?.notes ?? '',
    })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-xs px-2 py-0.5 rounded text-white flex items-center gap-1 ${SCOPE_STATUS_BG[current]}`}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full bg-white/60`} />
        {SCOPE_STATUS_LABELS[current]}
        <span className="text-white/60 ml-0.5">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-gray-800 border border-gray-700 rounded shadow-lg min-w-[130px]">
          {SCOPE_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleSelect(s)}
              className={`w-full text-left text-xs px-3 py-1.5 flex items-center gap-2 hover:bg-gray-700 ${s === current ? 'text-white' : 'text-gray-300'}`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${SCOPE_STATUS_DOT[s]}`} />
              {SCOPE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
