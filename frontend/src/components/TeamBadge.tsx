interface TeamBadgeProps {
  team: string
  func: string
  onRemove?: () => void
}

export function TeamBadge({ team, func, onRemove }: TeamBadgeProps) {
  const label = func ? `${team} · ${func}` : team
  return (
    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/50">
      {label}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="opacity-60 hover:opacity-100 leading-none ml-0.5"
        >
          ×
        </button>
      )}
    </span>
  )
}
