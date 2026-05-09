'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from '@/components/ui/LocaleLink'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { useAuth } from '@/context/AuthContext'
import { Shield, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'

export default function AdminAuthPage() {
  const router = useLocaleRouter()
  const { adminLogin, user, isAuthenticated, isLoading, isAtLeast } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (isAtLeast('Moderator')) router.replace('/admin')
      else router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, user, isAtLeast, router])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await adminLogin(email.trim(), password)
      router.replace('/admin')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка входа администратора.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[18px] border border-border bg-bg-card p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
        <div className="mb-5 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-base transition-colors">
            <ArrowLeft className="w-4 h-4" />
            На главную
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(201,143,177,0.28)] bg-[rgba(201,143,177,0.08)] px-3 py-1 text-[11px] tracking-[0.08em] uppercase text-[#efc7d9]">
            <Shield className="w-3.5 h-3.5" />
            Admin Access
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-h2 text-text-base">Вход администратора</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Доступ только для Moderator, SeniorAdmin и HeadAdmin.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full h-11 rounded-[10px] border border-border bg-bg-panel px-3 text-sm text-text-base outline-none focus:border-border-bright"
              placeholder="admin@barnamaj.kz"
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full h-11 rounded-[10px] border border-border bg-bg-panel px-3 text-sm text-text-base outline-none focus:border-border-bright"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-[10px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300 inline-flex gap-2 items-start w-full">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-[10px] border border-[rgba(73,71,171,0.35)] bg-[rgba(73,71,171,0.18)] text-sm font-[510] text-[#d8caef] hover:bg-[rgba(73,71,171,0.26)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Проверяем доступ...' : 'Войти в админ-панель'}
          </button>
        </form>

        <p className="mt-4 text-xs text-text-faint">
          Для обычных пользователей: <Link href="/auth?mode=login" className="text-[#b5b3ff] hover:text-accent-bright">обычный вход</Link>
        </p>
      </div>
    </div>
  )
}
