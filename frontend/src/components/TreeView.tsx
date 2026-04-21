import { useMemo } from 'react'
import { ProcessNode } from '../types/process'
import { useNavigationStore } from '../store/navigation'
import { TileRow } from './TileRow'

interface TreeViewProps {
  domain: ProcessNode
}

function buildNodeMap(nodes: ProcessNode[]): Map<string, ProcessNode> {
  const map = new Map<string, ProcessNode>()
  for (const node of nodes) {
    map.set(node.id, node)
    if (node.children.length > 0) {
      const childMap = buildNodeMap(node.children)
      childMap.forEach((v, k) => map.set(k, v))
    }
  }
  return map
}

export function TreeView({ domain }: TreeViewProps) {
  const { drillPath, selectNode } = useNavigationStore()

  const nodeMap = useMemo(() => buildNodeMap(domain.children), [domain])

  // Build the list of rows to render
  // Row at depth 0 = L1 children of domain
  // Row at depth N = children of drillPath[N-1]
  const rows: { nodes: ProcessNode[]; depth: number }[] = []

  // Always show L1
  if (domain.children.length > 0) {
    rows.push({ nodes: domain.children, depth: 0 })
  }

  // For each entry in drillPath, show children if the node exists and has children
  for (let i = 0; i < drillPath.length; i++) {
    const selectedId = drillPath[i]
    const selectedNode = nodeMap.get(selectedId)
    if (!selectedNode || selectedNode.children.length === 0) break
    rows.push({ nodes: selectedNode.children, depth: i + 1 })
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-950 flex flex-col gap-6">
      {rows.map(({ nodes, depth }) => {
        const selectedId = drillPath[depth] ?? null
        const parentNode = depth === 0 ? null : nodeMap.get(drillPath[depth - 1])
        const label =
          depth === 0
            ? 'Level 1'
            : `Level ${depth + 1} — ${parentNode?.name ?? ''}`

        return (
          <TileRow
            key={depth}
            nodes={nodes}
            selectedId={selectedId}
            onSelect={(node) => selectNode(node.id, depth + 1)}
            level={depth + 1}
            label={label}
          />
        )
      })}
    </div>
  )
}
