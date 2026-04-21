import { useFilterStore } from '../store/filters'
import type { Category, ReviewStatus } from '../types/classification'
import { CATEGORY_LABELS, REVIEW_STATUS_LABELS } from '../types/classification'
import { useTags, useTeams } from '../hooks/useTags'

const CATEGORY_ACTIVE: Record<Category, string> = {
  oss:          'bg-green-600 text-white border-green-600',
  oss_bss:      'bg-blue-600 text-white border-blue-600',
  bss:          'bg-orange-600 text-white border-orange-600',
  other:        'bg-gray-500 text-white border-gray-500',
  unclassified: 'bg-gray-600 text-white border-gray-600',
}

const CATEGORY_INACTIVE: Record<Category, string> = {
  oss:          'border-green-600 text-green-400 hover:bg-green-900/30',
  oss_bss:      'border-blue-600 text-blue-400 hover:bg-blue-900/30',
  bss:          'border-orange-600 text-orange-400 hover:bg-orange-900/30',
  other:        'border-gray-500 text-gray-400 hover:bg-gray-800',
  unclassified: 'border-gray-600 text-gray-500 hover:bg-gray-800',
}

const REVIEW_STATUSES: ReviewStatus[] = ['unreviewed', 'under_review', 'classified']

const DESCOPED_OPTIONS: Array<{ value: 'show' | 'dim' | 'hide'; label: string }> = [
  { value: 'show', label: 'Show' },
  { value: 'dim',  label: 'Dim' },
  { value: 'hide', label: 'Hide' },
]

const CATEGORIES: Category[] = ['oss', 'oss_bss', 'bss', 'other']

export function FilterBar() {
  const { categories, reviewStatuses, showDescoped, selectedTags, selectedTeam,
    toggleCategory, toggleReviewStatus, setShowDescoped, toggleTag, setTeam, clearAll } = useFilterStore()
  const { data: tagDefs = [] } = useTags()
  const { data: allTeams = [] } = useTeams()

  const teamNames = [...new Set(allTeams.map((t) => t.team))].sort()
  const hasActive = categories.length > 0 || reviewStatuses.length > 0 || selectedTags.length > 0 || selectedTeam !== null

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-5 py-2 flex items-center gap-3 flex-wrap">
      {/* Category toggles */}
      {CATEGORIES.map((cat) => {
        const active = categories.includes(cat)
        return (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${active ? CATEGORY_ACTIVE[cat] : CATEGORY_INACTIVE[cat]}`}
          >
            {CATEGORY_LABELS[cat]}
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

      {/* Descoped 3-way toggle */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">Descoped:</span>
        {DESCOPED_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setShowDescoped(value)}
            className={`text-xs px-2 py-1 rounded transition-colors ${showDescoped === value ? 'bg-gray-600 text-white' : 'text-gray-500 hover:bg-gray-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tag filters */}
      {tagDefs.length > 0 && (
        <>
          <div className="w-px h-5 bg-gray-700 mx-1" />
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
        </>
      )}

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

      {/* Active chips + clear */}
      {hasActive && (
        <>
          <div className="w-px h-5 bg-gray-700 mx-1" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <span key={cat} onClick={() => toggleCategory(cat)}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600 flex items-center gap-1">
                {CATEGORY_LABELS[cat]} <span className="text-gray-500">×</span>
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
            <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300 underline ml-1">
              Clear all
            </button>
          </div>
        </>
      )}
    </div>
  )
}
