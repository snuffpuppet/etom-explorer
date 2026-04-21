import { useState } from 'react'
import { ProcessNode } from '../types/process'
import type { Classification } from '../types/classification'
import { CATEGORY_COLOURS } from '../types/classification'
import { ClassificationPanel } from './ClassificationPanel'
import { TagBadge } from './TagBadge'
import { TeamBadge } from './TeamBadge'
import { useNavigationStore } from '../store/navigation'
import type { TagDef, TagAssignment, TeamAssignment } from '../types/tags'

interface ProcessTileProps {
  node: ProcessNode
  isSelected: boolean
  onSelect: () => void
  level: number
  siblingSelected: boolean
  classification?: Classification | null
  isDescoped?: boolean
  isMuted?: boolean
  tagDefs?: TagDef[]
  tagAssignments?: TagAssignment[]
  teamAssignments?: TeamAssignment[]
}

const VG_CHIP: Record<string, { abbr: string; cls: string }> = {
  'Fulfillment':                   { abbr: 'FUL', cls: 'bg-blue-900 text-blue-300' },
  'Assurance':                     { abbr: 'ASR', cls: 'bg-amber-900 text-amber-300' },
  'Billing':                       { abbr: 'BIL', cls: 'bg-green-900 text-green-300' },
  'Operations Readiness & Support':{ abbr: 'ORS', cls: 'bg-slate-700 text-slate-300' },
  'operations Readiness & Support':{ abbr: 'ORS', cls: 'bg-slate-700 text-slate-300' },
  'Strategy Management':           { abbr: 'SMT', cls: 'bg-purple-900 text-purple-300' },
  'strategy Management':           { abbr: 'SMT', cls: 'bg-purple-900 text-purple-300' },
  'Business Value Development':    { abbr: 'BVD', cls: 'bg-fuchsia-900 text-fuchsia-300' },
  'business Value Development':    { abbr: 'BVD', cls: 'bg-fuchsia-900 text-fuchsia-300' },
  'Capability Management':         { abbr: 'CAP', cls: 'bg-teal-900 text-teal-300' },
}

function getLevelBackground(level: number): string {
  if (level === 1) return 'bg-gray-800'
  if (level === 2) return 'bg-[#1a2030]'
  return 'bg-[#151c28]'
}

function getStatusDot(classification: Classification | null | undefined, isDescoped: boolean): { colour: string; title: string } {
  if (isDescoped) return { colour: 'bg-red-500', title: 'Descoped' }
  if (!classification) return { colour: 'bg-gray-600', title: 'Unreviewed' }
  switch (classification.review_status) {
    case 'classified':   return { colour: 'bg-green-500', title: 'Classified' }
    case 'under_review': return { colour: 'bg-yellow-500', title: 'Under Review' }
    case 'descoped':     return { colour: 'bg-red-500', title: 'Descoped' }
    default:             return { colour: 'bg-gray-600', title: 'Unreviewed' }
  }
}

export function ProcessTile({ node, isSelected, onSelect, level, siblingSelected, classification, isDescoped = false, isMuted = false, tagDefs = [], tagAssignments = [], teamAssignments = [] }: ProcessTileProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { openDetail } = useNavigationStore()

  const nodeTagAssignments = tagAssignments.filter((a) => a.node_id === node.id)
  const nodeTeamAssignments = teamAssignments.filter((t) => t.node_id === node.id)
  const tagDefsMap = new Map(tagDefs.map((t) => [t.id, t]))

  const bgClass = getLevelBackground(level)
  const childCount = node.children.length
  const dimmed = !isSelected && siblingSelected

  const borderColour = isDescoped
    ? 'border-red-500'
    : CATEGORY_COLOURS[classification?.category ?? 'unclassified']

  const dot = getStatusDot(classification, isDescoped)

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPanelOpen((v) => !v)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setPanelOpen(true)
  }

  if (isMuted) {
    return (
      <div
        className={[
          'flex flex-col border-l-4 rounded p-3',
          'min-w-[180px] flex-1 opacity-30 pointer-events-none',
          bgClass,
          borderColour,
        ].join(' ')}
      >
        <p className="text-sm font-semibold text-white line-clamp-2">{node.name}</p>
      </div>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        className={[
          'flex flex-col border-l-4 rounded p-3 cursor-pointer',
          'min-w-[180px] flex-1 transition-opacity',
          bgClass,
          borderColour,
          isSelected ? 'ring-2 ring-blue-400 opacity-100' : '',
          dimmed ? 'opacity-60' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Process name */}
        <p className={`text-sm font-semibold text-white line-clamp-2 ${isDescoped ? 'line-through opacity-50' : ''}`}>
          {node.name}
        </p>

        {/* Brief description */}
        {node.brief_description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{node.brief_description}</p>
        )}

        {/* Vertical group chips */}
        {node.vertical_groups.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {node.vertical_groups.map((vg) => {
              const chip = VG_CHIP[vg]
              if (!chip) return null
              return (
                <span key={vg} className={`text-[10px] font-medium px-1 py-0.5 rounded ${chip.cls}`}>
                  {chip.abbr}
                </span>
              )
            })}
          </div>
        )}

        {/* Tag + team badges */}
        {(nodeTagAssignments.length > 0 || nodeTeamAssignments.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {nodeTagAssignments.map((a) => {
              const def = tagDefsMap.get(a.tag_id)
              return def ? <TagBadge key={a.tag_id} name={def.name} colour={def.colour} cascade={a.cascade === 'true'} /> : null
            })}
            {nodeTeamAssignments.map((t, i) => (
              <TeamBadge key={i} team={t.team} func={t.function} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-xs text-gray-500">
            {childCount > 0 ? `${childCount} children` : ''}
          </span>
          <div className="flex items-center gap-1.5">
            {hovered && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); openDetail(node.id) }}
                  className="text-gray-400 hover:text-white text-xs leading-none"
                  title="View details"
                >
                  ⓘ
                </button>
                <button
                  onClick={handleEditClick}
                  className="text-gray-400 hover:text-white text-xs leading-none"
                  title="Edit classification"
                >
                  ✏️
                </button>
              </>
            )}
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot.colour}`} title={dot.title} />
          </div>
        </div>
      </div>

      {panelOpen && (
        <ClassificationPanel
          node={node}
          classification={classification ?? null}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
