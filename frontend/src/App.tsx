import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TopBar } from './components/TopBar'
import { DomainTabs } from './components/DomainTabs'
import { useProcessTree } from './hooks/useProcessTree'

const queryClient = new QueryClient()

function AppInner() {
  const { data: tree, isLoading, isError } = useProcessTree()

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
          <div className="flex-1 p-4 text-gray-500 text-sm">
            {/* TreeView will go here (Task 15) */}
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
