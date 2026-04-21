import { ProcessNode } from '../types/process'

interface ProcessTileProps {
  node: ProcessNode
  isSelected: boolean
  onSelect: () => void
  level: number    // 1-based depth in the tree (L1 = 1, L2 = 2, etc.)
  siblingSelected: boolean  // true if a sibling is selected (dims this tile)
}

function getLevelBackground(level: number): string {
  if (level === 1) return 'bg-gray-800'
  if (level === 2) return 'bg-[#1a2030]'
  return 'bg-[#151c28]'
}

export function ProcessTile({ node, isSelected, onSelect, level, siblingSelected }: ProcessTileProps) {
  const bgClass = getLevelBackground(level)
  const childCount = node.children.length

  const dimmed = !isSelected && siblingSelected

  return (
    <div
      onClick={onSelect}
      className={[
        'flex flex-col border-l-4 border-gray-500 rounded p-3 cursor-pointer',
        'min-w-[180px] flex-1 transition-opacity',
        bgClass,
        isSelected ? 'ring-2 ring-blue-400 opacity-100' : '',
        dimmed ? 'opacity-60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Process name */}
      <p className="text-sm font-semibold text-white line-clamp-2">{node.name}</p>

      {/* Brief description */}
      {node.brief_description && (
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{node.brief_description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <span className="text-xs text-gray-500">
          {childCount > 0 ? `${childCount} children` : ''}
        </span>
        {/* Placeholder dot for unreviewed status (Phase 3) */}
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-600" title="Unreviewed" />
      </div>
    </div>
  )
}
