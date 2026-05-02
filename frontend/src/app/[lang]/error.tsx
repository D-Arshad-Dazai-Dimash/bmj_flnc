'use client'

import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[PageError]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4">
      <p className="text-text-muted text-sm">Что-то пошло не так</p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-base hover:bg-bg-card transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Повторить
        </button>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-base hover:bg-bg-card transition-colors text-sm"
        >
          Обновить страницу
        </button>
      </div>
    </div>
  )
}
