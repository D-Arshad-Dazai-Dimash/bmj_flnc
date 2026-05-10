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

  // Vercel-style: монохром, сетка карточек, тонкие границы, минимализм
  const fieldCls = 'w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-base placeholder:text-text-faint transition-colors focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/10'

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <header className="border-b border-border pb-8">
        <h1 className="text-[34px] font-semibold tracking-[-0.02em] text-text-base">Профили</h1>
        <p className="mt-2 text-[15px] text-text-muted">Публичные карточки исполнителей, компаний и команд</p>
      </header>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-text-faint" />
            <input
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              placeholder="Поиск по имени или описанию…"
              className={`${fieldCls} pl-9`}
            />
          </div>
        </label>

        <select
          value={accountType}
          onChange={e => setAccountType(e.target.value as AccountTypeFilter)}
          className={fieldCls}
        >
          <option value="">Все типы</option>
          <option value="Individual">Исполнители</option>
          <option value="Company">Компании</option>
          <option value="Clan">Команды</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-5 text-sm text-red-300">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-12 text-center">
          <p className="text-base font-medium text-text-base">Профили не найдены</p>
          <p className="mt-1 text-sm text-text-muted">Попробуйте другой запрос или тип профиля</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
              >
                <Link
                  href={`/profiles/${p.id}`}
                  className="group block h-full rounded-xl border border-border bg-bg-card p-5 transition-all duration-150 hover:border-white/20 hover:bg-bg-elevated"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-elevated text-sm font-medium text-text-base">
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[15px] font-medium text-text-base">{p.name}</p>
                        {p.isVerified && (
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted">{p.accountType}</p>
                    </div>
                  </div>

                  {p.bio && <p className="mb-4 line-clamp-2 text-sm text-text-secondary">{p.bio}</p>}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {p.memberCount}</span>
                    {p.status && <span className="truncate">{p.status}</span>}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="rounded-md border border-border bg-bg-card px-4 py-2 text-sm text-text-base transition-colors hover:border-white/20 hover:bg-bg-elevated disabled:opacity-50"
              >
                {loadingMore ? 'Загрузка…' : 'Показать ещё'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
