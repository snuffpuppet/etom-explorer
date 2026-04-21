import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TopBar } from './components/TopBar'
import { DomainTabs } from './components/DomainTabs'
import { TreeView } from './components/TreeView'
import { useProcessTree } from './hooks/useProcessTree'
import { useNavigationStore } from './store/navigation'

const queryClient = new QueryClient()

function AppInner() {
  const { data: tree, isLoading, isError } = useProcessTree()
  const { activeDomainId, setActiveDomain } = useNavigationStore()

  // Auto-select first domain when data loads
  useEffect(() => {
    if (tree && tree.length > 0 && !activeDomainId) {
      setActiveDomain(tree[0].id)
    }
  }, [tree, activeDomainId, setActiveDomain])

  const activeDomain = tree?.find((d) => d.id === activeDomainId) ?? tree?.[0]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <TopBar />
      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading processes...
        </div>
      )}
      {isError && (
        <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
          Failed to load process tree.
        </div>
      )}
      {tree && (
        <>
          <DomainTabs domains={tree} />
          <div className="flex-1 bg-gray-950 flex flex-col overflow-hidden">
            {activeDomain && <TreeView domain={activeDomain} />}
          </div>
        </>
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
