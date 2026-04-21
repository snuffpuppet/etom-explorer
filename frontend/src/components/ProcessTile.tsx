import { useState } from 'react'
import { ProcessNode } from '../types/process'
import type { Classification } from '../types/classification'
import { CATEGORY_COLOURS } from '../types/classification'
import { ClassificationPanel } from './ClassificationPanel'

interface ProcessTileProps {
  node: ProcessNode
  isSelected: boolean
  onSelect: () => void
  level: number
  siblingSelected: boolean
  classification?: Classification | null
  isDescoped?: boolean
  isMuted?: boolean
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

export function ProcessTile({ node, isSelected, onSelect, level, siblingSelected, classification, isDescoped = false, isMuted = false }: ProcessTileProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

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

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-xs text-gray-500">
            {childCount > 0 ? `${childCount} children` : ''}
          </span>
          <div className="flex items-center gap-1.5">
            {hovered && (
              <button
                onClick={handleEditClick}
                className="text-gray-400 hover:text-white text-xs leading-none"
                title="Edit classification"
              >
                ✏️
              </button>
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
