import { useMemo } from 'react'
import { ProcessNode } from '../types/process'
import type { Classification, DescopedEntry, Category, ReviewStatus } from '../types/classification'
import { useNavigationStore } from '../store/navigation'
import { useFilterStore } from '../store/filters'
import { useClassifications, useDescoped } from '../hooks/useClassifications'
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

type Visibility = 'visible' | 'muted' | 'hidden'

function nodeMatchesFilters(
  node: ProcessNode,
  classificationsMap: Map<string, Classification>,
  descopedSet: Set<string>,
  categories: Category[],
  reviewStatuses: ReviewStatus[],
  showDescoped: 'show' | 'dim' | 'hide',
): boolean {
  const isDescoped = descopedSet.has(node.id)
  const cls = classificationsMap.get(node.id)

  if (isDescoped) {
    if (showDescoped === 'hide') return false
  }

  if (categories.length > 0) {
    const cat = cls?.category ?? 'unclassified'
    if (!categories.includes(cat)) return false
  }

  if (reviewStatuses.length > 0) {
    const rs = isDescoped ? 'descoped' : (cls?.review_status ?? 'unreviewed')
    if (!reviewStatuses.includes(rs as ReviewStatus)) return false
  }

  return true
}

function hasMatchingDescendant(
  node: ProcessNode,
  classificationsMap: Map<string, Classification>,
  descopedSet: Set<string>,
  categories: Category[],
  reviewStatuses: ReviewStatus[],
  showDescoped: 'show' | 'dim' | 'hide',
): boolean {
  for (const child of node.children) {
    if (nodeMatchesFilters(child, classificationsMap, descopedSet, categories, reviewStatuses, showDescoped)) return true
    if (hasMatchingDescendant(child, classificationsMap, descopedSet, categories, reviewStatuses, showDescoped)) return true
  }
  return false
}

function getVisibility(
  node: ProcessNode,
  classificationsMap: Map<string, Classification>,
  descopedSet: Set<string>,
  categories: Category[],
  reviewStatuses: ReviewStatus[],
  showDescoped: 'show' | 'dim' | 'hide',
  filtersActive: boolean,
): Visibility {
  if (!filtersActive) return 'visible'

  const matches = nodeMatchesFilters(node, classificationsMap, descopedSet, categories, reviewStatuses, showDescoped)
  if (matches) return 'visible'

  const descendantMatches = hasMatchingDescendant(node, classificationsMap, descopedSet, categories, reviewStatuses, showDescoped)
  if (descendantMatches) return 'muted'

  return 'hidden'
}

export function TreeView({ domain }: TreeViewProps) {
  const { drillPath, selectNode } = useNavigationStore()
  const { categories, reviewStatuses, showDescoped } = useFilterStore()
  const { data: classifications } = useClassifications()
  const { data: descopedList } = useDescoped()

  const nodeMap = useMemo(() => buildNodeMap(domain.children), [domain])

  const classificationsMap = useMemo(() => {
    const map = new Map<string, Classification>()
    for (const c of classifications ?? []) map.set(c.id, c)
    return map
  }, [classifications])

  const descopedSet = useMemo(() => {
    return new Set((descopedList ?? []).map((d: DescopedEntry) => d.id))
  }, [descopedList])

  const filtersActive = categories.length > 0 || reviewStatuses.length > 0 || showDescoped !== 'dim'

  const rows: { nodes: ProcessNode[]; depth: number }[] = []

  if (domain.children.length > 0) {
    rows.push({ nodes: domain.children, depth: 0 })
  }

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
            classificationsMap={classificationsMap}
            descopedSet={descopedSet}
            getVisibility={(node) => getVisibility(node, classificationsMap, descopedSet, categories, reviewStatuses, showDescoped, filtersActive)}
            showDescoped={showDescoped}
          />
        )
      })}
    </div>
  )
}
