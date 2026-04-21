import { useState } from 'react'
import type { ProcessNode } from '../types/process'
import type { Classification, DescopedEntry } from '../types/classification'
import { CATEGORY_LABELS, REVIEW_STATUS_LABELS } from '../types/classification'
import { useTags, useTagAssignments, useUpdateNodeTags, useTeams, useUpdateNodeTeams } from '../hooks/useTags'
import { TagBadge } from './TagBadge'
import { TeamBadge } from './TeamBadge'
import { NotesEditor } from './NotesEditor'

interface ProcessDetailProps {
  node: ProcessNode
  classification?: Classification | null
  descopedEntry?: DescopedEntry | null
  onClose: () => void
}

export function ProcessDetail({ node, classification, descopedEntry, onClose }: ProcessDetailProps) {
  const { data: tagDefs = [] } = useTags()
  const { data: allAssignments = [] } = useTagAssignments()
  const { data: allTeams = [] } = useTeams()
  const updateNodeTags = useUpdateNodeTags()
  const updateNodeTeams = useUpdateNodeTeams()

  const nodeAssignments = allAssignments.filter((a) => a.node_id === node.id)
  const nodeTeams = allTeams.filter((t) => t.node_id === node.id)

  // Tag editing state
  const [editingTags, setEditingTags] = useState(false)
  const [selectedTags, setSelectedTags] = useState<{ tag_id: string; cascade: boolean }[]>(
    nodeAssignments.map((a) => ({ tag_id: a.tag_id, cascade: a.cascade === 'true' }))
  )

  // Team editing state
  const [editingTeams, setEditingTeams] = useState(false)
  const [teamRows, setTeamRows] = useState<{ team: string; function: string }[]>(
    nodeTeams.map((t) => ({ team: t.team, function: t.function }))
  )
  const [newTeam, setNewTeam] = useState('')
  const [newFunc, setNewFunc] = useState('')

  function toggleTag(tagId: string) {
    setSelectedTags((prev) => {
      const exists = prev.find((t) => t.tag_id === tagId)
      return exists ? prev.filter((t) => t.tag_id !== tagId) : [...prev, { tag_id: tagId, cascade: false }]
    })
  }

  function toggleCascade(tagId: string) {
    setSelectedTags((prev) =>
      prev.map((t) => t.tag_id === tagId ? { ...t, cascade: !t.cascade } : t)
    )
  }

  function saveTags() {
    updateNodeTags.mutate({ nodeId: node.id, assignments: selectedTags })
    setEditingTags(false)
  }

  function addTeamRow() {
    if (!newTeam.trim()) return
    setTeamRows((prev) => [...prev, { team: newTeam.trim(), function: newFunc.trim() }])
    setNewTeam('')
    setNewFunc('')
  }

  function removeTeamRow(idx: number) {
    setTeamRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function saveTeams() {
    updateNodeTeams.mutate({ nodeId: node.id, assignments: teamRows })
    setEditingTeams(false)
  }

  const tagDefsMap = new Map(tagDefs.map((t) => [t.id, t]))

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gray-900 border-l border-gray-700 h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <p className="text-xs text-gray-500 mb-1">Level {node.level} · {node.id}</p>
            <h2 className="text-white font-semibold text-base leading-snug">{node.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none ml-4 mt-0.5">×</button>
        </div>

        <div className="flex-1 px-5 py-4 flex flex-col gap-5">
          {/* Description */}
          {(node.brief_description || node.extended_description) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</h3>
              {node.brief_description && (
                <p className="text-sm text-gray-300 mb-2">{node.brief_description}</p>
              )}
              {node.extended_description && (
                <p className="text-xs text-gray-500 leading-relaxed">{node.extended_description}</p>
              )}
            </section>
          )}

          {/* Classification */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Classification</h3>
            {descopedEntry ? (
              <div className="text-sm text-red-400">
                Descoped — {descopedEntry.reason || 'no reason given'}
              </div>
            ) : classification ? (
              <div className="flex flex-col gap-1">
                <div className="text-sm text-white">{CATEGORY_LABELS[classification.category]}</div>
                <div className="text-xs text-gray-500">{REVIEW_STATUS_LABELS[classification.review_status]}</div>
                {classification.notes && (
                  <p className="text-xs text-gray-400 mt-1">{classification.notes}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Unclassified</p>
            )}
          </section>

          {/* Tags */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tags</h3>
              {!editingTags && (
                <button onClick={() => setEditingTags(true)} className="text-xs text-gray-500 hover:text-white">
                  Edit
                </button>
              )}
            </div>

            {editingTags ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {tagDefs.map((tag) => {
                    const selected = selectedTags.find((t) => t.tag_id === tag.id)
                    const cascade = selected?.cascade ?? false
                    return (
                      <div key={tag.id} className="flex items-center gap-1">
                        <button
                          onClick={() => toggleTag(tag.id)}
                          className={`text-xs px-2 py-0.5 rounded border transition-colors ${selected ? 'opacity-100' : 'opacity-40'}`}
                          style={{ borderColor: tag.colour, color: tag.colour, backgroundColor: selected ? tag.colour + '22' : undefined }}
                        >
                          {tag.name}
                        </button>
                        {selected && (
                          <button
                            onClick={() => toggleCascade(tag.id)}
                            className={`text-xs px-1 py-0.5 rounded border ${cascade ? 'border-gray-400 text-gray-300' : 'border-gray-700 text-gray-600'}`}
                            title="Cascade to children"
                          >
                            ↓
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {tagDefs.length === 0 && (
                    <p className="text-xs text-gray-500">No tags defined. Use the Tags button to create some.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={saveTags} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">Save</button>
                  <button onClick={() => { setSelectedTags(nodeAssignments.map((a) => ({ tag_id: a.tag_id, cascade: a.cascade === 'true' }))); setEditingTags(false) }} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {nodeAssignments.length === 0 && <p className="text-xs text-gray-500">No tags assigned</p>}
                {nodeAssignments.map((a) => {
                  const def = tagDefsMap.get(a.tag_id)
                  if (!def) return null
                  return <TagBadge key={a.tag_id} name={def.name} colour={def.colour} cascade={a.cascade === 'true'} />
                })}
              </div>
            )}
          </section>

          {/* Teams */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Teams</h3>
              {!editingTeams && (
                <button onClick={() => setEditingTeams(true)} className="text-xs text-gray-500 hover:text-white">
                  Edit
                </button>
              )}
            </div>

            {editingTeams ? (
              <div className="flex flex-col gap-2">
                {teamRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-white flex-1">{row.team}{row.function ? ` · ${row.function}` : ''}</span>
                    <button onClick={() => removeTeamRow(i)} className="text-xs text-gray-600 hover:text-red-400">Remove</button>
                  </div>
                ))}
                <div className="flex gap-1.5 mt-1">
                  <input
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value)}
                    placeholder="Team"
                    className="bg-gray-800 text-white rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-gray-600"
                  />
                  <input
                    value={newFunc}
                    onChange={(e) => setNewFunc(e.target.value)}
                    placeholder="Function"
                    className="bg-gray-800 text-white rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-gray-600"
                    onKeyDown={(e) => e.key === 'Enter' && addTeamRow()}
                  />
                  <button onClick={addTeamRow} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">Add</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveTeams} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">Save</button>
                  <button onClick={() => { setTeamRows(nodeTeams.map((t) => ({ team: t.team, function: t.function }))); setEditingTeams(false) }} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {nodeTeams.length === 0 && <p className="text-xs text-gray-500">No teams assigned</p>}
                {nodeTeams.map((t, i) => (
                  <TeamBadge key={i} team={t.team} func={t.function} />
                ))}
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</h3>
            <NotesEditor nodeId={node.id} />
          </section>

          {/* Metadata */}
          <section className="text-xs text-gray-600 flex flex-col gap-1 mt-auto pt-2 border-t border-gray-800">
            {node.domain && <div>Domain: {node.domain}</div>}
            {node.vertical_groups.length > 0 && <div>Vertical group: {node.vertical_groups.join(', ')}</div>}
            {node.children.length > 0 && <div>{node.children.length} child processes</div>}
          </section>
        </div>
      </div>
    </div>
  )
}
