import type { ProcessNode } from '../types/process'
import { useNavigationStore } from '../store/navigation'

interface DomainTabsProps {
  domains: ProcessNode[]
  activeView: 'tree' | 'list'
  onViewChange: (view: 'tree' | 'list') => void
}

export function DomainTabs({ domains, activeView, onViewChange }: DomainTabsProps) {
  const { activeDomainId, setActiveDomain } = useNavigationStore()

  return (
    <div className="bg-gray-800 w-full flex">
      {domains.map((domain) => {
        const isActive = activeView === 'tree' && domain.id === activeDomainId
        return (
          <button
            key={domain.id}
            onClick={() => { onViewChange('tree'); setActiveDomain(domain.id) }}
            className={
              isActive
                ? 'px-5 py-3 text-sm font-medium text-white border-b-2 border-blue-500'
                : 'px-5 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 border-b-2 border-transparent'
            }
          >
            {domain.name}
          </button>
        )
      })}
      <div className="flex-1" />
      <button
        onClick={() => onViewChange('list')}
        className={
          activeView === 'list'
            ? 'px-5 py-3 text-sm font-medium text-white border-b-2 border-blue-500'
            : 'px-5 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 border-b-2 border-transparent'
        }
      >
        List
      </button>
    </div>
  )
}
