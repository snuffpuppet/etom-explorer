import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatMessage } from './ChatMessage'
import { ModelSelector } from './ModelSelector'
import { SeedingButton } from './SeedingButton'

interface ChatPanelProps {
  onClose: () => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm your eTOM process explorer assistant. Ask me about processes, classifications, or help with impact analysis.",
}

function makeId() {
  return Math.random().toString(36).slice(2)
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [provider, setProvider] = useState('claude')
  const [model, setModel] = useState('')
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    const userMsg: Message = { id: makeId(), role: 'user', content: text }
    const assistantId = makeId()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', isStreaming: true }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }))

    try {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, messages: history }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${response.status}`, isStreaming: false }
              : m
          )
        )
        setSending(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        buffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let payload: { chunk?: string; done?: boolean; error?: string }
          try {
            payload = JSON.parse(line.slice(6))
          } catch {
            continue
          }
          if (payload.error) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: `Error: ${payload.error}`, isStreaming: false }
                  : m
              )
            )
          } else if (payload.done) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isStreaming: false } : m
              )
            )
          } else if (payload.chunk) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + payload.chunk }
                  : m
              )
            )
          }
        }
      }
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m)
      )
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${String(err)}`, isStreaming: false }
            : m
        )
      )
    } finally {
      setSending(false)
    }
  }, [input, sending, messages, provider, model])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-gray-900 border-l border-gray-700 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 gap-2 flex-wrap">
        <span className="text-white font-semibold text-sm shrink-0">eTOM Chat Assistant</span>
        <div className="flex items-center gap-2 flex-wrap">
          <ModelSelector
            provider={provider}
            model={model}
            onProviderChange={setProvider}
            onModelChange={setModel}
          />
          <SeedingButton provider={provider} model={model} />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none px-1"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about eTOM processes…"
          rows={2}
          className="flex-1 bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 resize-none focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={() => void sendMessage()}
          disabled={sending || !input.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm px-3 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  )
}
