'use client'

import { useEffect, useState } from 'react'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/dashboard/Sidebar'
import { Loader2, RefreshCw } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useLocaleRouter()
  const [timedOut, setTimedOut] = useState(false)

  // Если isLoading > 8 секунд — что-то пошло не так
  useEffect(() => {
    if (!isLoading) return
    const t = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(t)
  }, [isLoading])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth?mode=login')
      return
    }

    if (!isLoading && isAuthenticated && user) {
      // Если админ/модератор → переправить на /admin
      if (user.role === 'Moderator' || user.role === 'SeniorAdmin' || user.role === 'HeadAdmin') {
        router.replace('/admin')
        return
      }
    }
  }, [isLoading, isAuthenticated, user?.role, router])

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

  if (!isAuthenticated || (user && (user.role === 'Moderator' || user.role === 'SeniorAdmin' || user.role === 'HeadAdmin'))) return null

  return (
    <div className="min-h-screen bg-bg-base flex">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
