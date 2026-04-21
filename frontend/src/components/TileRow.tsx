import { ProcessNode } from '../types/process'
import { ProcessTile } from './ProcessTile'

interface TileRowProps {
  nodes: ProcessNode[]
  selectedId: string | null    // ID of currently selected node in this row
  onSelect: (node: ProcessNode) => void
  level: number                // 1-based depth (for tile styling)
  label: string                // e.g. "Level 1", "Level 2 — Fulfillment"
}

export function TileRow({ nodes, selectedId, onSelect, level, label }: TileRowProps) {
  const hasSiblingSelected = selectedId !== null

  return (
    <div>
      {/* Connector line from selected tile above */}
      {level > 1 && (
        <div className="w-0.5 h-4 bg-blue-400/50 ml-8 mb-1" />
      )}

      {/* Row label */}
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">{label}</p>

      {/* Tiles */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {nodes.map((node) => (
          <ProcessTile
            key={node.id}
            node={node}
            isSelected={node.id === selectedId}
            onSelect={() => onSelect(node)}
            level={level}
            siblingSelected={hasSiblingSelected && node.id !== selectedId}
          />
        ))}
      </div>
    </div>
  )
}
