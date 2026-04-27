import { useMemo, useState } from 'react'
import type { ProcessNode } from '../types/process'
import type { Classification } from '../types/classification'
import { REVIEW_STATUS_LABELS } from '../types/classification'
import { useProcessTree } from '../hooks/useProcessTree'
import { useClassifications } from '../hooks/useClassifications'
import { useTags, useTagAssignments, useTeams } from '../hooks/useTags'
import { useFilterStore } from '../store/filters'
import { useNavigationStore } from '../store/navigation'
import { ScopeDropdown } from './ScopeDropdown'
import { TagBadge } from './TagBadge'
import { TeamBadge } from './TeamBadge'

function normalizeVG(vg: string): string {
  return vg.trim().toLowerCase()
}

type SortKey = 'name' | 'domain' | 'scope' | 'status'

export function L2ListView() {
  const { data: tree = [] } = useProcessTree()
  const { data: classifications = [] } = useClassifications()
  const { data: tagDefs = [] } = useTags()
  const { data: tagAssignments = [] } = useTagAssignments()
  const { data: teamAssignments = [] } = useTeams()
  const { scopeStatuses, reviewStatuses, selectedTags, selectedTeam, selectedVGs } = useFilterStore()
  const { openDetail } = useNavigationStore()

  const [sortKey, setSortKey] = useState<SortKey>('domain')
  const [sortAsc, setSortAsc] = useState(true)

  const classificationsMap = useMemo(() => {
    const map = new Map<string, Classification>()
    for (const c of classifications) map.set(c.id, c)
    return map
  }, [classifications])

  const tagAssignmentMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of tagAssignments) map.set(a.node_id, [...(map.get(a.node_id) ?? []), a.tag_id])
    return map
  }, [tagAssignments])

  const teamAssignmentMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const t of teamAssignments) map.set(t.node_id, [...(map.get(t.node_id) ?? []), t.team])
    return map
  }, [teamAssignments])

  const tagDefsMap = new Map(tagDefs.map((t) => [t.id, t]))

  const l2Nodes = useMemo(() => {
    const nodes: ProcessNode[] = []
    for (const l0 of tree) {
      for (const l1 of l0.children) {
        for (const l2 of l1.children) {
          if (l2.level === 2) nodes.push(l2)
        }
      }
    }
    return nodes
  }, [tree])

  const filtered = useMemo(() => {
    return l2Nodes.filter((node) => {
      const cls = classificationsMap.get(node.id)

      if (scopeStatuses.length > 0) {
        const ss = cls?.scope_status ?? 'tbd'
        if (!scopeStatuses.includes(ss)) return false
      }

      if (reviewStatuses.length > 0) {
        const rs = cls?.review_status ?? 'unreviewed'
        if (!reviewStatuses.includes(rs)) return false
      }

      if (selectedTags.length > 0) {
        const nodeTags = tagAssignmentMap.get(node.id) ?? []
        if (!selectedTags.some((t) => nodeTags.includes(t))) return false
      }

      if (selectedTeam !== null) {
        const nodeTeams = teamAssignmentMap.get(node.id) ?? []
        if (!nodeTeams.includes(selectedTeam)) return false
      }

      if (selectedVGs.length > 0) {
        const normalizedSelected = selectedVGs.map(normalizeVG)
        if (!node.vertical_groups.some(vg => normalizedSelected.includes(normalizeVG(vg)))) return false
      }

      return true
    })
  }, [l2Nodes, classificationsMap, scopeStatuses, reviewStatuses, selectedTags, tagAssignmentMap, selectedTeam, teamAssignmentMap, selectedVGs])

  const SCOPE_ORDER: Record<string, number> = { in_scope: 0, gap: 1, adjacent: 2, tbd: 3, out_of_scope: 4 }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortKey === 'domain') {
        cmp = (a.domain ?? '').localeCompare(b.domain ?? '') || a.name.localeCompare(b.name)
      } else if (sortKey === 'scope') {
        const sa = classificationsMap.get(a.id)?.scope_status ?? 'tbd'
        const sb = classificationsMap.get(b.id)?.scope_status ?? 'tbd'
        cmp = (SCOPE_ORDER[sa] ?? 99) - (SCOPE_ORDER[sb] ?? 99) || a.name.localeCompare(b.name)
      } else if (sortKey === 'status') {
        const ra = classificationsMap.get(a.id)?.review_status ?? 'unreviewed'
        const rb = classificationsMap.get(b.id)?.review_status ?? 'unreviewed'
        cmp = ra.localeCompare(rb) || a.name.localeCompare(b.name)
      }
      return sortAsc ? cmp : -cmp
    })
  }, [filtered, sortKey, sortAsc, classificationsMap])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    return (
      <th
        onClick={() => handleSort(k)}
        className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-white select-none"
      >
        {label}{sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
      </th>
    )
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

  return (
    <div className="flex-1 overflow-auto px-5 py-4 bg-gray-950">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">{sorted.length} of {l2Nodes.length} L2 processes</p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-gray-900 z-10">
          <tr className="border-b border-gray-700">
            <SortHeader label="Process" k="name" />
            <SortHeader label="Domain" k="domain" />
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">VG</th>
            <SortHeader label="Scope" k="scope" />
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Tags</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Team</th>
            <SortHeader label="Status" k="status" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((node) => {
            const cls = classificationsMap.get(node.id) ?? null
            const nodeTags = tagAssignmentMap.get(node.id) ?? []
            const nodeTeams = (teamAssignments ?? []).filter((t) => t.node_id === node.id)
            const rs = cls?.review_status ?? 'unreviewed'

            return (
              <tr
                key={node.id}
                onClick={() => openDetail(node.id)}
                className="border-b border-gray-800 hover:bg-gray-900 cursor-pointer"
              >
                <td className="px-3 py-2">
                  <p className="text-white font-medium">{node.name}</p>
                  <p className="text-xs font-mono text-gray-500">{node.id}</p>
                </td>
                <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{node.domain ?? '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {node.vertical_groups.map((vg) => {
                      const chip = VG_CHIP[vg]
                      return chip ? (
                        <span key={vg} title={vg} className={`text-[10px] font-semibold px-1 py-0.5 rounded ${chip.cls}`}>{chip.abbr}</span>
                      ) : null
                    })}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <ScopeDropdown node={node} classification={cls} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {nodeTags.map((tagId) => {
                      const def = tagDefsMap.get(tagId)
                      const assignment = tagAssignments.find((a) => a.node_id === node.id && a.tag_id === tagId)
                      return def ? <TagBadge key={tagId} name={def.name} colour={def.colour} cascade={assignment?.cascade === 'true'} /> : null
                    })}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {nodeTeams.map((t, i) => <TeamBadge key={i} team={t.team} func={t.function} />)}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs text-gray-400">{REVIEW_STATUS_LABELS[rs]}</span>
                </td>
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">No processes match the current filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
