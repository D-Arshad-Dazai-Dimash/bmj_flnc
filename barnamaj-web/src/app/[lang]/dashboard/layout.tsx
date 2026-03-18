'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/dashboard/Sidebar'
import AiManagerWidget from '@/components/AiManagerWidget'
import { Loader2, RefreshCw } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useLocaleRouter()
  const supabase = useMemo(() => createClient(), [])
  const [timedOut, setTimedOut] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)

  // Check ai_manager feature flag
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('user_features')
      .select('enabled')
      .eq('user_id', user.id)
      .eq('feature_name', 'ai_manager')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.enabled) setAiEnabled(true)
      })
  }, [user?.id, supabase])

  // Если isLoading > 8 секунд — что-то пошло не так
  useEffect(() => {
    if (!isLoading) return
    const t = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(t)
  }, [isLoading])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth?mode=login')
    }
  }, [isLoading, isAuthenticated, router])

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

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-bg-base flex">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>
      {aiEnabled && user && <AiManagerWidget userId={user.id} />}
    </div>
  )
}
