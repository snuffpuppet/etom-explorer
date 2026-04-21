import { useEffect, useRef, useState } from 'react'

interface SeedingButtonProps {
  provider: string
  model: string
}

type SeedStatus = 'idle' | 'running' | 'done' | 'error'

interface SeedResult {
  classified?: number
  [key: string]: unknown
}

export function SeedingButton({ provider, model }: SeedingButtonProps) {
  const [status, setStatus] = useState<SeedStatus>('idle')
  const [resultCount, setResultCount] = useState<number>(0)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    return () => clearPolling()
  }, [])

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  function startPolling() {
    clearPolling()
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/llm/seed/status')
        const data: { status: string; result: SeedResult | null } = await res.json()
        if (data.status === 'done') {
          clearPolling()
          setResultCount(data.result?.classified ?? 0)
          setStatus('done')
          timeoutRef.current = setTimeout(() => setStatus('idle'), 3000)
        } else if (data.status === 'error') {
          clearPolling()
          setStatus('error')
        }
      } catch {
        clearPolling()
        setStatus('error')
      }
    }, 2000)
  }

  async function handleClick() {
    if (status === 'running') return
    setStatus('running')
    setErrorMsg('')
    try {
      const res = await fetch('/api/llm/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model }),
      })
      if (res.status === 409) {
        setErrorMsg('Already running')
        setStatus('error')
        return
      }
      if (!res.ok) {
        setStatus('error')
        return
      }
      startPolling()
    } catch {
      setStatus('error')
    }
  }

  if (status === 'idle') {
    return (
      <button
        onClick={handleClick}
        className="text-xs px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
      >
        Seed with AI
      </button>
    )
  }

  if (status === 'running') {
    return (
      <button
        disabled
        className="text-xs px-3 py-1 rounded bg-gray-700 text-gray-400 flex items-center gap-1 cursor-not-allowed"
      >
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Seeding...
      </button>
    )
  }

  if (status === 'done') {
    return (
      <span className="text-xs px-3 py-1 rounded bg-green-900 text-green-300">
        ✓ Seeded ({resultCount} classified)
      </span>
    )
  }

  // error
  return (
    <button
      onClick={() => { setStatus('idle'); setErrorMsg('') }}
      className="text-xs px-3 py-1 rounded bg-red-900 hover:bg-red-800 text-red-300"
      title={errorMsg || undefined}
    >
      {errorMsg || 'Seeding failed'}
    </button>
  )
}
