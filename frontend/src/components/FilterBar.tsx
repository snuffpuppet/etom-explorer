import { useFilterStore, S2R_VGS, OPS_VGS } from '../store/filters'
import type { ScopeStatus, ReviewStatus } from '../types/classification'
import { SCOPE_STATUS_LABELS, SCOPE_STATUS_BG, REVIEW_STATUS_LABELS, SCOPE_STATUSES, REVIEW_STATUSES } from '../types/classification'
import { useTags, useTeams } from '../hooks/useTags'

const SCOPE_INACTIVE: Record<ScopeStatus, string> = {
  tbd:          'border-gray-600 text-gray-500 hover:bg-gray-800',
  in_scope:     'border-green-600 text-green-400 hover:bg-green-900/30',
  adjacent:     'border-blue-600 text-blue-400 hover:bg-blue-900/30',
  out_of_scope: 'border-red-600 text-red-400 hover:bg-red-900/30',
  gap:          'border-amber-600 text-amber-400 hover:bg-amber-900/30',
}

const VG_FILTER_CONFIG: Array<{ vg: string; abbr: string; bg: string; text: string }> = [
  { vg: 'Fulfillment',                    abbr: 'FUL', bg: '#1e3a5f', text: '#93c5fd' },
  { vg: 'Assurance',                      abbr: 'ASR', bg: '#451a03', text: '#fcd34d' },
  { vg: 'Billing',                        abbr: 'BIL', bg: '#14532d', text: '#6ee7b7' },
  { vg: 'Operations Readiness & Support', abbr: 'ORS', bg: '#334155', text: '#cbd5e1' },
  { vg: 'Strategy Management',            abbr: 'SMT', bg: '#3b0764', text: '#d8b4fe' },
  { vg: 'Business Value Development',     abbr: 'BVD', bg: '#4a044e', text: '#f0abfc' },
  { vg: 'Capability Management',          abbr: 'CAP', bg: '#042f2e', text: '#5eead4' },
]

export function FilterBar() {
  const {
    scopeStatuses, reviewStatuses, selectedTags, selectedTeam, selectedVGs,
    toggleScopeStatus, toggleReviewStatus, toggleTag, setTeam, toggleVG, toggleLifecycleArea, clearAll,
  } = useFilterStore()
  const { data: tagDefs = [] } = useTags()
  const { data: allTeams = [] } = useTeams()
  const teamNames = [...new Set(allTeams.map((t) => t.team))].sort()

  const s2rActive = S2R_VGS.every(vg => selectedVGs.includes(vg))
  const opsActive = OPS_VGS.every(vg => selectedVGs.includes(vg))

  const hasActive = scopeStatuses.length > 0 || reviewStatuses.length > 0 || selectedTags.length > 0 || selectedTeam !== null || selectedVGs.length > 0

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-5 py-2 flex items-center gap-3 flex-wrap">

      {/* Scope status toggles */}
      {SCOPE_STATUSES.map((s) => {
        const active = scopeStatuses.includes(s)
        return (
          <button
            key={s}
            onClick={() => toggleScopeStatus(s)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${active ? SCOPE_STATUS_BG[s] + ' text-white border-transparent' : SCOPE_INACTIVE[s]}`}
          >
            {SCOPE_STATUS_LABELS[s]}
          </button>
        )
      })}

      <div className="w-px h-5 bg-gray-700 mx-1" />

      {/* Review status toggles */}
      {REVIEW_STATUSES.map((rs) => {
        const active = reviewStatuses.includes(rs)
        return (
          <button
            key={rs}
            onClick={() => toggleReviewStatus(rs)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${active ? 'bg-gray-500 text-white border-gray-500' : 'border-gray-600 text-gray-400 hover:bg-gray-800'}`}
          >
            {REVIEW_STATUS_LABELS[rs]}
          </button>
        )
      })}

      <div className="w-px h-5 bg-gray-700 mx-1" />

      {/* Tag filters */}
      {tagDefs.length > 0 && (
        <>
          {tagDefs.map((tag) => {
            const active = selectedTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className="text-xs px-2.5 py-1 rounded border transition-colors"
                style={active
                  ? { backgroundColor: tag.colour, borderColor: tag.colour, color: 'white' }
                  : { borderColor: tag.colour + '88', color: tag.colour + 'cc' }
                }
              >
                {tag.name}
              </button>
            )
          })}
          <div className="w-px h-5 bg-gray-700 mx-1" />
        </>
      )}

      {/* Lifecycle area toggles (S2R / OPS) */}
      <span className="text-xs text-gray-500">Lifecycle:</span>
      <button
        onClick={() => toggleLifecycleArea('S2R')}
        className={`text-xs px-2 py-1 rounded border transition-colors ${s2rActive ? 'bg-purple-700 text-white border-purple-700' : 'border-purple-800 text-purple-400 hover:bg-purple-900/30'}`}
        title="Strategy-to-Readiness: Strategy Management, Capability Management, Business Value Development"
      >
        S2R
      </button>
      <button
        onClick={() => toggleLifecycleArea('OPS')}
        className={`text-xs px-2 py-1 rounded border transition-colors ${opsActive ? 'bg-cyan-700 text-white border-cyan-700' : 'border-cyan-800 text-cyan-400 hover:bg-cyan-900/30'}`}
        title="Operations: Operations Readiness & Support, Fulfillment, Assurance, Billing"
      >
        OPS
      </button>

      {/* VG fine-grain toggles */}
      <span className="text-xs text-gray-500 ml-1">VG:</span>
      {VG_FILTER_CONFIG.map(({ vg, abbr, bg, text }) => {
        const active = selectedVGs.includes(vg)
        return (
          <button
            key={vg}
            onClick={() => toggleVG(vg)}
            title={vg}
            className="text-xs px-2 py-1 rounded border transition-colors"
            style={active
              ? { backgroundColor: bg, borderColor: bg, color: text }
              : { borderColor: text + '88', color: text + 'cc' }
            }
          >
            {abbr}
          </button>
        )
      })}

      {/* Team filter */}
      {teamNames.length > 0 && (
        <>
          <div className="w-px h-5 bg-gray-700 mx-1" />
          <select
            value={selectedTeam ?? ''}
            onChange={(e) => setTeam(e.target.value || null)}
            className="text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 focus:outline-none"
          >
            <option value="">All teams</option>
            {teamNames.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </>
      )}

      {/* Active filter chips + clear */}
      {hasActive && (
        <>
          <div className="w-px h-5 bg-gray-700 mx-1" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {scopeStatuses.map((s) => (
              <span key={s} onClick={() => toggleScopeStatus(s)}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-1">
                {SCOPE_STATUS_LABELS[s]} <span className="text-gray-500">×</span>
              </span>
            ))}
            {reviewStatuses.map((rs) => (
              <span key={rs} onClick={() => toggleReviewStatus(rs)}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-1">
                {REVIEW_STATUS_LABELS[rs]} <span className="text-gray-500">×</span>
              </span>
            ))}
            {selectedTags.map((tagId) => {
              const def = tagDefs.find((t) => t.id === tagId)
              return def ? (
                <span key={tagId} onClick={() => toggleTag(tagId)}
                  className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-1">
                  {def.name} <span className="text-gray-500">×</span>
                </span>
              ) : null
            })}
            {selectedTeam && (
              <span onClick={() => setTeam(null)}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-1">
                {selectedTeam} <span className="text-gray-500">×</span>
              </span>
            )}
            {selectedVGs.map((vg) => {
              const cfg = VG_FILTER_CONFIG.find((c) => c.vg === vg)
              return (
                <span key={vg} onClick={() => toggleVG(vg)}
                  className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-1">
                  {cfg ? cfg.abbr : vg} <span className="text-gray-500">×</span>
                </span>
              )
            })}
            <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300 underline ml-1">
              Clear all
            </button>
          </div>
        </>
      )}
    </div>
  )
}
