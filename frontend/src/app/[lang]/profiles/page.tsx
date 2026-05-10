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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">Профили пользователей</h1>
        <p className="text-[15px] text-text-secondary">Публичные и безопасные карточки: имя, статус, деятельность и публикации проектов</p>
      </div>

      <div className="grid gap-3 rounded-[14px] border border-border bg-bg-card p-4 md:grid-cols-[1fr_220px]">
        <label className="block">
          <span className="mb-1 block text-xs text-text-secondary">Поиск по имени и описанию</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-text-faint" />
            <input
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              placeholder="Например: backend, mobile, studio"
              className="w-full rounded-[10px] border border-border bg-bg-elevated py-2 pl-8 pr-3 text-sm text-text-base placeholder:text-text-faint focus:border-border-focus focus:outline-none"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-text-secondary">Тип профиля</span>
          <select
            value={accountType}
            onChange={e => setAccountType(e.target.value as AccountTypeFilter)}
            className="w-full rounded-[10px] border border-border bg-bg-elevated px-3 py-2 text-sm text-text-base focus:border-border-focus focus:outline-none"
          >
            <option value="">Все</option>
            <option value="Individual">Исполнители</option>
            <option value="Company">Компании</option>
            <option value="Clan">Команды</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
      ) : error ? (
        <div className="rounded-[14px] border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-bg-card p-10 text-center text-sm text-text-secondary">Профили не найдены</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
                className="rounded-[14px] border border-border bg-bg-card p-4 transition-colors hover:border-border-bright hover:bg-bg-elevated"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="truncate text-base font-semibold text-text-base">{p.name}</p>
                  {p.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                      <ShieldCheck className="h-3 w-3" /> verified
                    </span>
                  )}
                </div>

                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-text-faint">
                  <span>{p.accountType}</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {p.memberCount}</span>
                  {p.status && <span className="chip border-border bg-bg-elevated text-text-secondary">{p.status}</span>}
                </div>

                {p.bio && <p className="mb-3 line-clamp-3 text-sm text-text-secondary">{p.bio}</p>}

                <Link
                  href={`/profiles/${p.id}`}
                  className="inline-flex items-center rounded-[8px] border border-border bg-bg-elevated px-3 py-1.5 text-xs text-[#c7d8ff] transition-colors hover:bg-bg-hover"
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
              className="rounded-[10px] border border-border bg-bg-elevated px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-50"
            >
              {loadingMore ? 'Загрузка...' : 'Показать ещё'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
