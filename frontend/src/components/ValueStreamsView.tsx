import { useMemo, useState } from 'react'
import { useValueStreams } from '../hooks/useValueStreams'
import type { ValueStream } from '../hooks/useValueStreams'
import { useProcessTree } from '../hooks/useProcessTree'
import type { ProcessNode } from '../types/process'

function buildFlatMap(nodes: ProcessNode[], map: Map<string, ProcessNode> = new Map()): Map<string, ProcessNode> {
  for (const node of nodes) {
    map.set(node.id, node)
    buildFlatMap(node.children, map)
  }
  return map
}

function StreamCard({ stream, processMap }: { stream: ValueStream; processMap: Map<string, ProcessNode> }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-gray-900 rounded border border-gray-800 mb-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800 transition-colors rounded"
        aria-expanded={expanded}
      >
        <span className="text-sm font-medium text-white">{stream.name}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-gray-800">
          {stream.process_ids.length === 0 ? (
            <p className="text-xs text-gray-500 py-2 px-4">No processes assigned</p>
          ) : (
            stream.process_ids.map((pid) => {
              const node = processMap.get(pid)
              return (
                <div
                  key={pid}
                  className="text-xs text-gray-300 py-1 px-3 border-b border-gray-800 last:border-0"
                >
                  <span className="text-gray-500 mr-2">{pid}</span>
                  {node ? node.name : <span className="text-gray-600 italic">Unknown process</span>}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export function ValueStreamsView() {
  const { data: streams = [], isLoading, isError } = useValueStreams()
  const { data: tree = [] } = useProcessTree()

  const processMap = useMemo(() => buildFlatMap(tree), [tree])

  const customerStreams = streams.filter((s) => s.category === 'customer')
  const operationalStreams = streams.filter((s) => s.category === 'operational')

  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-950 overflow-auto flex items-center justify-center text-gray-400 text-sm">
        Loading value streams...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex-1 bg-gray-950 overflow-auto flex items-center justify-center text-red-400 text-sm">
        Failed to load value streams.
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-950 overflow-auto p-4">
      {customerStreams.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Customer Value Streams
          </h2>
          {customerStreams.map((s) => (
            <StreamCard key={s.id} stream={s} processMap={processMap} />
          ))}
        </section>
      )}
      {operationalStreams.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Operational Value Streams
          </h2>
          {operationalStreams.map((s) => (
            <StreamCard key={s.id} stream={s} processMap={processMap} />
          ))}
        </section>
      )}
      {streams.length === 0 && (
        <p className="text-gray-500 text-sm">No value streams found.</p>
      )}
    </div>
  )
}
