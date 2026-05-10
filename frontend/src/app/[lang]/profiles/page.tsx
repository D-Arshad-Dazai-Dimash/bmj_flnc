'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Users, ShieldCheck } from 'lucide-react'
import Link from '@/components/ui/LocaleLink'
import { api, ApiError, type ProfileSummaryDto } from '@/lib/api'

type AccountTypeFilter = '' | 'Individual' | 'Company' | 'Clan'

export default function ProfilesDirectoryPage() {
  const [qInput, setQInput] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [accountType, setAccountType] = useState<AccountTypeFilter>('')

  const [page, setPage] = useState(1)
  const [items, setItems] = useState<ProfileSummaryDto[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(qInput.trim()), 300)
    return () => clearTimeout(t)
  }, [qInput])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      setPage(1)

      try {
        const data = await api.profiles.search({
          q: qDebounced || undefined,
          accountType: accountType || undefined,
          page: 1,
          pageSize: 24,
        })
        setItems(data)
        setHasMore(data.length === 24)
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Не удалось загрузить профили')
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [qDebounced, accountType])

  const onLoadMore = async () => {
    const next = page + 1
    setLoadingMore(true)
    setError(null)

    try {
      const data = await api.profiles.search({
        q: qDebounced || undefined,
        accountType: accountType || undefined,
        page: next,
        pageSize: 24,
      })
      setItems(prev => [...prev, ...data])
      setHasMore(data.length === 24)
      setPage(next)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось догрузить профили')
    } finally {
      setLoadingMore(false)
    }
  }

  // --- UI: градиентный фон, карточки с тенью, border glow для верифицированных ---
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1a2236] via-[#232b47] to-[#2a3152] py-8 px-0 sm:px-2 md:px-6 space-y-8">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-white drop-shadow-lg mb-1 flex items-center gap-2">
          <span className="inline-block bg-gradient-to-r from-[#7fd7ff] via-[#a88bff] to-[#ffb8e2] bg-clip-text text-transparent">Профили пользователей</span>
        </h1>
        <p className="text-[16px] text-[#b6c6e3] font-medium">Публичные и безопасные карточки: имя, статус, деятельность и публикации проектов</p>
      </div>

      <div className="grid gap-5 rounded-2xl border border-[#2e3650] bg-gradient-to-br from-[#232b47]/80 to-[#2a3152]/90 p-6 md:grid-cols-[1fr_220px] shadow-xl">
        <label className="block">
          <span className="mb-1 block text-xs text-[#b6c6e3]">Поиск по имени и описанию</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[#8fa2c7]" />
            <input
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              placeholder="Например: backend, mobile, studio"
              className="w-full rounded-xl border border-[#2e3650] bg-[#232b47] py-2 pl-8 pr-3 text-sm text-white placeholder:text-[#8fa2c7] focus:border-[#7fd7ff] focus:outline-none transition"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-[#b6c6e3]">Тип профиля</span>
          <select
            value={accountType}
            onChange={e => setAccountType(e.target.value as AccountTypeFilter)}
            className="w-full rounded-xl border border-[#2e3650] bg-[#232b47] px-3 py-2 text-sm text-white focus:border-[#7fd7ff] focus:outline-none transition"
          >
            <option value="">Все</option>
            <option value="Individual">Исполнители</option>
            <option value="Company">Компании</option>
            <option value="Clan">Команды</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7fd7ff] border-t-transparent" /></div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300 shadow-lg">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[#2e3650] bg-[#232b47] p-10 text-center text-lg text-[#b6c6e3] shadow-lg">Профили не найдены</div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
                className={`rounded-2xl border bg-gradient-to-br from-[#232b47]/80 to-[#2a3152]/90 p-5 shadow-xl transition-all duration-200 hover:scale-[1.025] hover:shadow-2xl hover:border-[#7fd7ff] ${p.isVerified ? 'border-emerald-400/60 ring-2 ring-emerald-300/30' : 'border-[#2e3650]'}`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="truncate text-lg font-semibold text-white drop-shadow-sm">{p.name}</p>
                  {p.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-200 shadow">
                      <ShieldCheck className="h-4 w-4" /> verified
                    </span>
                  )}
                </div>

                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#b6c6e3]">
                  <span>{p.accountType}</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {p.memberCount}</span>
                  {p.status && <span className="chip border-[#7fd7ff]/30 bg-[#7fd7ff]/10 text-[#7fd7ff]">{p.status}</span>}
                </div>

                {p.bio && <p className="mb-3 line-clamp-3 text-sm text-[#b6c6e3]">{p.bio}</p>}

                <Link
                  href={`/profiles/${p.id}`}
                  className="inline-flex items-center rounded-xl border border-[#7fd7ff] bg-gradient-to-r from-[#7fd7ff]/20 to-[#a88bff]/20 px-4 py-2 text-sm text-white font-semibold shadow hover:scale-105 hover:bg-[#7fd7ff]/30 transition-all duration-200"
                >
                  Открыть профиль
                </Link>
              </motion.article>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="rounded-xl border border-[#2e3650] bg-[#232b47] px-5 py-2 text-base text-[#b6c6e3] font-medium shadow hover:bg-[#2a3152] hover:text-white transition-all duration-200 disabled:opacity-50"
            >
              {loadingMore ? 'Загрузка...' : 'Показать ещё'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
