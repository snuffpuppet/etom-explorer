import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ProcessNode } from './types/process'
import { TopBar } from './components/TopBar'
import { DomainTabs } from './components/DomainTabs'
import { FilterBar } from './components/FilterBar'
import { TreeView } from './components/TreeView'
import { L2ListView } from './components/L2ListView'
import { ValueStreamsView } from './components/ValueStreamsView'
import { TagManager } from './components/TagManager'
import { ProcessDetail } from './components/ProcessDetail'
import { ChatPanel } from './components/ChatPanel'
import { ExportDialog } from './components/ExportDialog'
import { useProcessTree } from './hooks/useProcessTree'
import { useNavigationStore } from './store/navigation'
import { useClassifications } from './hooks/useClassifications'

const queryClient = new QueryClient()

function AppInner() {
  const { data: tree, isLoading, isError } = useProcessTree()
  const { activeDomainId, setActiveDomain, detailNodeId, closeDetail } = useNavigationStore()
  const { data: classifications = [] } = useClassifications()
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [valueStreamsOpen, setValueStreamsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [activeView, setActiveView] = useState<'tree' | 'list'>('tree')

  useEffect(() => {
    if (tree && tree.length > 0 && !activeDomainId) {
      setActiveDomain(tree[0].id)
    }
  }, [tree, activeDomainId, setActiveDomain])

  const activeDomain = tree?.find((d) => d.id === activeDomainId) ?? tree?.[0]

  const detailNode = detailNodeId && tree
    ? (() => {
        function find(nodes: ProcessNode[]): ProcessNode | null {
          for (const n of nodes) {
            if (n.id === detailNodeId) return n
            const found = find(n.children)
            if (found) return found
          }
          return null
        }
        return find(tree)
      })()
    : null

  const detailClassification = classifications.find((c) => c.id === detailNodeId) ?? null

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <TopBar
        onOpenTagManager={() => setTagManagerOpen(true)}
        onOpenChat={() => setChatOpen(true)}
        onToggleValueStreams={() => setValueStreamsOpen((v) => !v)}
        valueStreamsActive={valueStreamsOpen}
        onOpenExport={() => setExportOpen(true)}
      />
      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading processes...</div>
      )}
      {isError && (
        <div className="flex-1 flex items-center justify-center text-red-400 text-sm">Failed to load process tree.</div>
      )}
      {tree && (
        <>
          <DomainTabs domains={tree} activeView={activeView} onViewChange={setActiveView} />
          <FilterBar />
          <div className="flex-1 bg-gray-950 flex flex-col overflow-hidden">
            {valueStreamsOpen
              ? <ValueStreamsView />
              : activeView === 'list'
                ? <L2ListView />
                : activeDomain && <TreeView domain={activeDomain} />
            }
          </div>
        </>
      )}
      {tagManagerOpen && <TagManager onClose={() => setTagManagerOpen(false)} />}
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
      {detailNode && (
        <ProcessDetail
          node={detailNode}
          classification={detailClassification}
          onClose={closeDetail}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  )
}

export default App
