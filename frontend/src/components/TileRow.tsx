import { ProcessNode } from '../types/process'
import type { Classification } from '../types/classification'
import type { TagDef, TagAssignment, TeamAssignment } from '../types/tags'
import { ProcessTile } from './ProcessTile'

type Visibility = 'visible' | 'muted' | 'hidden'

interface TileRowProps {
  nodes: ProcessNode[]
  selectedId: string | null
  onSelect: (node: ProcessNode) => void
  level: number
  label: string
  classificationsMap: Map<string, Classification>
  descopedSet: Set<string>
  getVisibility: (node: ProcessNode) => Visibility
  showDescoped: 'show' | 'dim' | 'hide'
  tagDefs?: TagDef[]
  tagAssignments?: TagAssignment[]
  teamAssignments?: TeamAssignment[]
}

export function TileRow({ nodes, selectedId, onSelect, level, label, classificationsMap, descopedSet, getVisibility, showDescoped, tagDefs, tagAssignments, teamAssignments }: TileRowProps) {
  const hasSiblingSelected = selectedId !== null

  return (
    <div>
      {level > 1 && (
        <div className="w-0.5 h-4 bg-blue-400/50 ml-8 mb-1" />
      )}

      <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">{label}</p>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {nodes.map((node) => {
          const vis = getVisibility(node)
          const isDescoped = descopedSet.has(node.id)

          if (vis === 'hidden') return null

          // If descoped and showDescoped is 'dim', render dimmed
          const dimDescoped = isDescoped && showDescoped === 'dim'

          return (
            <ProcessTile
              key={node.id}
              node={node}
              isSelected={node.id === selectedId}
              onSelect={() => onSelect(node)}
              level={level}
              siblingSelected={hasSiblingSelected && node.id !== selectedId}
              classification={classificationsMap.get(node.id) ?? null}
              isDescoped={isDescoped}
              isMuted={vis === 'muted' || dimDescoped}
              tagDefs={tagDefs}
              tagAssignments={tagAssignments}
              teamAssignments={teamAssignments}
            />
          )
        })}
      </div>
    </div>
  )
}
