export function TopBar() {
  return (
    <div className="bg-gray-900 w-full px-5 py-3 flex items-center justify-between">
      <span className="text-white font-semibold text-lg">eTOM Explorer</span>
      <input
        type="text"
        placeholder="Search processes..."
        className="bg-gray-800 text-gray-400 placeholder-gray-500 rounded px-4 py-1.5 text-sm w-72 focus:outline-none focus:ring-1 focus:ring-gray-600"
      />
      <div className="flex items-center gap-2">
        <button className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-1.5 rounded">
          Value Streams
        </button>
        <button className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-1.5 rounded">
          💬 Chat
        </button>
      </div>
    </div>
  )
}
