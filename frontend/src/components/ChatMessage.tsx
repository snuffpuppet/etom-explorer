import { ProcessLink } from './ProcessLink'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

function parseContent(content: string): React.ReactNode[] {
  const pattern = /\[Process:\s*([^\]]+)\]/g
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index)
    if (before) nodes.push(before)
    nodes.push(
      <ProcessLink key={match.index} processId={match[1].trim()} />
    )
    lastIndex = match.index + match[0].length
  }

  const remaining = content.slice(lastIndex)
  if (remaining) nodes.push(remaining)

  return nodes
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const nodes = parseContent(content)

  if (isStreaming && nodes.length > 0) {
    const last = nodes[nodes.length - 1]
    if (typeof last === 'string') {
      nodes[nodes.length - 1] = (
        <span key="last-text">
          {last}
          <span className="animate-pulse inline-block">▋</span>
        </span>
      )
    } else {
      nodes.push(
        <span key="cursor" className="animate-pulse inline-block">▋</span>
      )
    }
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-indigo-600 text-white rounded-lg px-3 py-2 max-w-[80%] text-sm whitespace-pre-wrap">
          {nodes}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="bg-gray-800 text-gray-100 rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap">
        {nodes}
      </div>
    </div>
  )
}
