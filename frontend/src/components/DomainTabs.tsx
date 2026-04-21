import type { ProcessNode } from '../types/process'
import { useNavigationStore } from '../store/navigation'

interface DomainTabsProps {
  domains: ProcessNode[]
}

export function DomainTabs({ domains }: DomainTabsProps) {
  const { activeDomainId, setActiveDomain } = useNavigationStore()

  return (
    <div className="bg-gray-800 w-full flex">
      {domains.map((domain) => {
        const isActive = domain.id === activeDomainId
        return (
          <button
            key={domain.id}
            onClick={() => setActiveDomain(domain.id)}
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
    </div>
  )
}
