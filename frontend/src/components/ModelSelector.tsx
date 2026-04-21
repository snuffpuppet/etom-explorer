import { useEffect, useState } from 'react'

interface ModelSelectorProps {
  provider: string
  model: string
  onProviderChange: (p: string) => void
  onModelChange: (m: string) => void
}

const PROVIDERS = ['claude', 'openrouter']

export function ModelSelector({ provider, model, onProviderChange, onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<string[]>([])

  useEffect(() => {
    setModels([])
    fetch(`/api/llm/models?provider=${encodeURIComponent(provider)}`)
      .then((r) => r.json())
      .then((data: { provider: string; models: string[] }) => {
        setModels(data.models ?? [])
        if (data.models && data.models.length > 0) {
          onModelChange(data.models[0])
        }
      })
      .catch(() => setModels([]))
  }, [provider]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectClass = 'bg-gray-800 text-white text-xs border border-gray-700 rounded px-2 py-1'

  return (
    <div className="flex items-center gap-2">
      <select
        value={provider}
        onChange={(e) => onProviderChange(e.target.value)}
        className={selectClass}
      >
        {PROVIDERS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <select
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        className={selectClass}
        disabled={models.length === 0}
      >
        {models.length === 0 && <option value="">loading...</option>}
        {models.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  )
}
