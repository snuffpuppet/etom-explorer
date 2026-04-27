import { useMemo } from 'react'
import { ProcessNode } from '../types/process'
import type { Classification, ScopeStatus, ReviewStatus } from '../types/classification'
import { useNavigationStore } from '../store/navigation'
import { useFilterStore } from '../store/filters'
import { useClassifications } from '../hooks/useClassifications'
import { useTags, useTagAssignments, useTeams } from '../hooks/useTags'
import { TileRow } from './TileRow'

interface TreeViewProps {
  domain: ProcessNode
}

function buildNodeMap(nodes: ProcessNode[]): Map<string, ProcessNode> {
  const map = new Map<string, ProcessNode>()
  for (const node of nodes) {
    map.set(node.id, node)
    if (node.children.length > 0) {
      buildNodeMap(node.children).forEach((v, k) => map.set(k, v))
    }
  }
  return map
}

type Visibility = 'visible' | 'muted' | 'hidden'

function normalizeVG(vg: string): string {
  return vg.trim().toLowerCase()
}

interface FilterParams {
  classificationsMap: Map<string, Classification>
  scopeStatuses: ScopeStatus[]
  reviewStatuses: ReviewStatus[]
  selectedTags: string[]
  tagAssignmentMap: Map<string, string[]>
  selectedTeam: string | null
  teamAssignmentMap: Map<string, string[]>
  selectedVGs: string[]
}

function nodeMatchesFilters(node: ProcessNode, fp: FilterParams): boolean {
  const cls = fp.classificationsMap.get(node.id)

  if (fp.scopeStatuses.length > 0) {
    const ss = cls?.scope_status ?? 'tbd'
    if (!fp.scopeStatuses.includes(ss)) return false
  }

  if (fp.reviewStatuses.length > 0) {
    const rs = cls?.review_status ?? 'unreviewed'
    if (!fp.reviewStatuses.includes(rs)) return false
  }

  if (fp.selectedTags.length > 0) {
    const nodeTags = fp.tagAssignmentMap.get(node.id) ?? []
    if (!fp.selectedTags.some((t) => nodeTags.includes(t))) return false
  }

  if (fp.selectedTeam !== null) {
    const nodeTeams = fp.teamAssignmentMap.get(node.id) ?? []
    if (!nodeTeams.includes(fp.selectedTeam)) return false
  }

  if (fp.selectedVGs.length > 0) {
    const normalizedSelected = fp.selectedVGs.map(normalizeVG)
    if (!node.vertical_groups.some(vg => normalizedSelected.includes(normalizeVG(vg)))) return false
  }

  return true
}

function hasMatchingDescendant(node: ProcessNode, fp: FilterParams): boolean {
  for (const child of node.children) {
    if (nodeMatchesFilters(child, fp)) return true
    if (hasMatchingDescendant(child, fp)) return true
  }
  return false
}

function getVisibility(node: ProcessNode, fp: FilterParams, filtersActive: boolean): Visibility {
  if (!filtersActive) return 'visible'
  if (nodeMatchesFilters(node, fp)) return 'visible'
  if (hasMatchingDescendant(node, fp)) return 'muted'
  return 'hidden'
}

export function TreeView({ domain }: TreeViewProps) {
  const { drillPath, selectNode } = useNavigationStore()
  const { scopeStatuses, reviewStatuses, selectedTags, selectedTeam, selectedVGs } = useFilterStore()
  const { data: classifications } = useClassifications()
  const { data: tagDefs = [] } = useTags()
  const { data: tagAssignments = [] } = useTagAssignments()
  const { data: teamAssignments = [] } = useTeams()

  const nodeMap = useMemo(() => buildNodeMap(domain.children), [domain])

  const classificationsMap = useMemo(() => {
    const map = new Map<string, Classification>()
    for (const c of classifications ?? []) map.set(c.id, c)
    return map
  }, [classifications])

  const tagAssignmentMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of tagAssignments) {
      map.set(a.node_id, [...(map.get(a.node_id) ?? []), a.tag_id])
    }
    return map
  }, [tagAssignments])

  const teamAssignmentMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const t of teamAssignments) {
      map.set(t.node_id, [...(map.get(t.node_id) ?? []), t.team])
    }
    return map
  }, [teamAssignments])

  const filtersActive = scopeStatuses.length > 0 || reviewStatuses.length > 0 || selectedTags.length > 0 || selectedTeam !== null || selectedVGs.length > 0

  const fp: FilterParams = { classificationsMap, scopeStatuses, reviewStatuses, selectedTags, tagAssignmentMap, selectedTeam, teamAssignmentMap, selectedVGs }

  const rows: { nodes: ProcessNode[]; depth: number }[] = []
  if (domain.children.length > 0) rows.push({ nodes: domain.children, depth: 0 })
  for (let i = 0; i < drillPath.length; i++) {
    const selectedNode = nodeMap.get(drillPath[i])
    if (!selectedNode || selectedNode.children.length === 0) break
    rows.push({ nodes: selectedNode.children, depth: i + 1 })
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-950 flex flex-col gap-6">
      {rows.map(({ nodes, depth }) => {
        const selectedId = drillPath[depth] ?? null
        const parentNode = depth === 0 ? null : nodeMap.get(drillPath[depth - 1])
        const levelNum = nodes[0]?.level ?? depth + 2
        const label = depth === 0 ? `Level ${levelNum}` : `Level ${levelNum} — ${parentNode?.name ?? ''}`
        return (
          <TileRow
            key={depth}
            nodes={nodes}
            selectedId={selectedId}
            onSelect={(node) => selectNode(node.id, depth + 1)}
            level={depth + 1}
            label={label}
            classificationsMap={classificationsMap}
            getVisibility={(node) => getVisibility(node, fp, filtersActive)}
            tagDefs={tagDefs}
            tagAssignments={tagAssignments}
            teamAssignments={teamAssignments}
          />
        )
      })}
    </div>
  )
}
