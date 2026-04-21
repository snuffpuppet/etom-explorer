import { useNavigationStore } from '../store/navigation'

interface ProcessLinkProps {
  processId: string
  label?: string
}

export function ProcessLink({ processId, label }: ProcessLinkProps) {
  const openDetail = useNavigationStore((s) => s.openDetail)

  return (
    <button
      onClick={() => openDetail(processId)}
      className="text-purple-400 hover:text-purple-300 underline cursor-pointer font-mono text-sm"
    >
      {label ?? processId}
    </button>
  )
}
