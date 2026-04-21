interface TagBadgeProps {
  name: string
  colour: string
  cascade?: boolean
  onRemove?: () => void
}

export function TagBadge({ name, colour, cascade, onRemove }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium"
      style={{ backgroundColor: colour + '33', color: colour, border: `1px solid ${colour}55` }}
      title={cascade ? 'Cascaded from ancestor' : undefined}
    >
      {cascade && <span className="opacity-60">↓</span>}
      {name}
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
