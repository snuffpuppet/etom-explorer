import { useState, useRef, useEffect } from 'react'
import { useSearch } from '../hooks/useTags'
import { useNavigationStore } from '../store/navigation'

export function SearchBox() {
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const { navigateTo } = useNavigationStore()
  const { data: results } = useSearch(debouncedQ)

  // Debounce input → search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 250)
    return () => clearTimeout(t)
  }, [query])

  // Open dropdown when results arrive
  useEffect(() => {
    if (results && results.length > 0) setOpen(true)
  }, [results])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleSelect(result: NonNullable<typeof results>[number]) {
    // ancestor_ids: [L0, L1?, ...parents], last item before node is the immediate parent
    // The domain is the L1 ancestor (index 1 if L0 is index 0)
    const allIds = [...result.ancestor_ids, result.id]
    // First id is L0 (functional area) — skip it. Remaining are the drill path.
    const drillIds = allIds.slice(1)
    if (drillIds.length === 0) return
    const domainId = drillIds[0]
    const drillPath = drillIds.slice(1)
    navigateTo(domainId, drillPath)
    setQuery('')
    setDebouncedQ('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div ref={boxRef} className="relative w-72">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { if (results && results.length > 0) setOpen(true) }}
        placeholder="Search processes..."
        className="bg-gray-800 text-white placeholder-gray-500 rounded px-4 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-gray-600"
      />
      {query.length > 0 && (
        <button
          onClick={() => { setQuery(''); setDebouncedQ(''); setOpen(false) }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm leading-none"
        >
          ×
        </button>
      )}

      {open && results && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 max-h-80 overflow-y-auto">
          {results.slice(0, 30).map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0"
            >
              <div className="text-sm text-white">{r.name}</div>
              {r.breadcrumbs.length > 0 && (
                <div className="text-xs text-gray-500 mt-0.5 truncate">
                  {r.breadcrumbs.join(' › ')}
                </div>
              )}
            </button>
          ))}
          {results.length > 30 && (
            <div className="px-3 py-1.5 text-xs text-gray-500 italic">
              {results.length - 30} more — refine your search
            </div>
          )}
        </div>
      )}

      {open && debouncedQ.length >= 2 && results?.length === 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 px-3 py-2 text-xs text-gray-500">
          No results for "{debouncedQ}"
        </div>
      )}
    </div>
  )
}
