import { useState } from 'react'

type ExportFormat = 'markdown' | 'html'

interface ExportDialogProps {
  onClose: () => void
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: selectedFormat }),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `etom-requirements.${selectedFormat === 'html' ? 'html' : 'md'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 100)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg border border-gray-700 p-5 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Export Requirements Document</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">
            ×
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-3">Format</p>
        <div className="flex flex-col gap-2 mb-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="export-format"
              value="markdown"
              checked={selectedFormat === 'markdown'}
              onChange={() => setSelectedFormat('markdown')}
              className="accent-blue-500"
            />
            <span className="text-sm text-white">Markdown (.md)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="export-format"
              value="html"
              checked={selectedFormat === 'html'}
              onChange={() => setSelectedFormat('html')}
              className="accent-blue-500"
            />
            <span className="text-sm text-white">HTML (.html)</span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-400 mb-3">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={exporting}
            className="text-sm text-gray-400 hover:text-white px-4 py-1.5 rounded disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium px-4 py-1.5 rounded"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
