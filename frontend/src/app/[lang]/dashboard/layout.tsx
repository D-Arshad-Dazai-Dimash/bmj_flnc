'use client'

import { useEffect, useState } from 'react'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import Sidebar from '@/components/dashboard/Sidebar'
import { Loader2, RefreshCw } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, allowed } = useRoleGuard('dashboard')
  const [timedOut, setTimedOut] = useState(false)

  // Если isLoading > 8 секунд — что-то пошло не так
  useEffect(() => {
    if (!isLoading) return
    const t = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(t)
  }, [isLoading])

  if (isLoading) {
    if (timedOut) {
      return (
        <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4">
          <p className="text-text-muted text-sm">Не удалось загрузить профиль</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-base hover:bg-bg-card transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Обновить страницу
          </button>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  if (!allowed) return null

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1600px] px-5 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
