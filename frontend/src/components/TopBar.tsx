import { SearchBox } from './SearchBox'

interface TopBarProps {
  onOpenTagManager: () => void
  onOpenChat: () => void
  onToggleValueStreams: () => void
  valueStreamsActive: boolean
}

export function TopBar({ onOpenTagManager, onOpenChat, onToggleValueStreams, valueStreamsActive }: TopBarProps) {
  return (
    <div className="bg-gray-900 w-full px-5 py-3 flex items-center justify-between">
      <span className="text-white font-semibold text-lg">eTOM Explorer</span>
      <SearchBox />
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenTagManager}
          className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-1.5 rounded border border-gray-700"
        >
          Tags
        </button>
        <button
          onClick={onToggleValueStreams}
          className={`text-white text-sm font-medium px-4 py-1.5 rounded ${
            valueStreamsActive
              ? 'bg-purple-700 ring-2 ring-purple-400'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          Value Streams
        </button>
        <button
          onClick={onOpenChat}
          className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-1.5 rounded"
        >
          Chat
        </button>
      </div>
    </div>
  )
}
