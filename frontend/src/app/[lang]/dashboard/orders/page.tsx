'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  Calendar,
  Banknote,
  Heart,
  Users,
  ChevronRight,
} from 'lucide-react'
import { api, ApiError, type ProjectSummaryDto } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import LocaleLink from '@/components/ui/LocaleLink'
import { Tooltip } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { getLikedIds, toggleLike } from '@/lib/socialStore'

type SortValue = 'newest' | 'budget_asc' | 'budget_desc' | 'deadline_asc'
type ClientType = 'Individual' | 'Company' | 'Clan' | ''
type Tab = 'all' | 'liked'

function CompactProjectCard({
  project,
  liked,
  onToggleLike,
}: {
  project: ProjectSummaryDto
  liked: boolean
  onToggleLike: (id: string) => void
}) {
  return (
    <LocaleLink
      href={`/dashboard/orders/${project.id}`}
      className="group relative flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-bg-card px-4 py-3.5 transition-all duration-150 hover:border-white/20 hover:bg-bg-elevated"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-[15px] font-medium tracking-tight text-text-base group-hover:text-white">
            {project.title}
          </h3>
          <span className="shrink-0 text-[11px] text-text-faint">
            {new Date(project.createdAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
          <span className="truncate text-text-secondary">{project.clientProfileName}</span>
          {project.budget != null && (
            <span className="inline-flex items-center gap-1">
              <Banknote className="h-3 w-3" />
              <span className="font-medium text-text-base">
                {project.budget.toLocaleString('ru-RU')} ₸
              </span>
            </span>
          )}
          {project.deadline && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              до {new Date(project.deadline).toLocaleDateString('ru-RU')}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {project.applicationCount}
          </span>
        </div>
      </div>

      <Tooltip label={liked ? 'Убрать из понравившихся' : 'Сохранить'}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleLike(project.id)
          }}
          aria-pressed={liked}
          aria-label="Нравится"
          className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-all ${
            liked
              ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
              : 'border-transparent text-text-faint hover:border-border hover:bg-bg-hover hover:text-text-base'
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
        </button>
      </Tooltip>

      <ChevronRight className="h-4 w-4 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-text-base" />
    </LocaleLink>
  )
}

function CardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-bg-card px-4 py-3.5">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-8" />
    </div>
  )
}

export default function OrdersPage() {
  const { user } = useAuth()

  const [tab, setTab] = useState<Tab>('all')
  const [qInput, setQInput] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [deadlineTo, setDeadlineTo] = useState('')
  const [clientType, setClientType] = useState<ClientType>('')
  const [sort, setSort] = useState<SortValue>('newest')

  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [items, setItems] = useState<ProjectSummaryDto[]>([])
  const [hasMore, setHasMore] = useState(true)

  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.id) return
    setLikedSet(getLikedIds(user.id))
  }, [user?.id])

  const handleToggleLike = useCallback(
    (projectId: string) => {
      if (!user?.id) return
      setLikedSet((prev) => {
        const next = new Set(prev)
        if (next.has(projectId)) next.delete(projectId)
        else next.add(projectId)
        return next
      })
      toggleLike(user.id, projectId)
    },
    [user?.id],
  )

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(qInput.trim()), 350)
    return () => clearTimeout(t)
  }, [qInput])

  const feedQuery = useMemo(
    () => ({
      q: qDebounced || undefined,
      minBudget: minBudget ? Number(minBudget) : undefined,
      maxBudget: maxBudget ? Number(maxBudget) : undefined,
      deadlineTo: deadlineTo || undefined,
      clientType: clientType || undefined,
      sort,
    }),
    [qDebounced, minBudget, maxBudget, deadlineTo, clientType, sort],
  )

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      setErrMsg(null)
      if (append) setLoadingMore(true)
      else setLoading(true)

      try {
        const data = await api.projects.feed({
          ...feedQuery,
          page: targetPage,
          pageSize: 20,
        })
        setItems((prev) => (append ? [...prev, ...data] : data))
        setHasMore(data.length === 20)
      } catch (e) {
        setErrMsg(e instanceof ApiError ? e.message : 'Ошибка загрузки ленты')
        if (!append) setItems([])
      } finally {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    },
    [feedQuery],
  )

  useEffect(() => {
    setPage(1)
    load(1, false)
  }, [load])

  const onLoadMore = async () => {
    const next = page + 1
    setPage(next)
    await load(next, true)
  }

  const resetFilters = () => {
    setQInput('')
    setMinBudget('')
    setMaxBudget('')
    setDeadlineTo('')
    setClientType('')
    setSort('newest')
  }

  const visibleItems = useMemo(() => {
    if (tab === 'liked') return items.filter((p) => likedSet.has(p.id))
    return items
  }, [items, likedSet, tab])

  const fieldCls =
    'w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-base placeholder:text-text-faint transition-colors focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/10'

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-text-base sm:text-[32px]">
            Лента заказов
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Кликните по карточке, чтобы открыть детали и подать отклик.
          </p>
        </div>
        {!loading && items.length > 0 && tab === 'all' && (
          <span className="text-xs text-text-muted">
            {items.length}
            {hasMore ? '+' : ''} результатов
          </span>
        )}
      </header>

      <div className="flex w-full items-center gap-1 rounded-lg border border-border bg-bg-card p-1 sm:w-fit">
        <button
          onClick={() => setTab('all')}
          className={`flex-1 cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
            tab === 'all'
              ? 'bg-bg-elevated text-text-base'
              : 'text-text-muted hover:text-text-base'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => setTab('liked')}
          disabled={!user?.id}
          className={`flex-1 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
            tab === 'liked'
              ? 'bg-bg-elevated text-text-base'
              : 'text-text-muted hover:text-text-base'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Heart
            className={`h-3.5 w-3.5 ${tab === 'liked' ? 'fill-rose-400 text-rose-400' : ''}`}
          />
          Понравилось
          {likedSet.size > 0 && (
            <span className="rounded-full bg-bg-base px-1.5 py-0.5 text-[10px] text-text-muted">
              {likedSet.size}
            </span>
          )}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit space-y-4 rounded-xl border border-border bg-bg-card p-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-text-base">
              <SlidersHorizontal className="h-4 w-4" /> Фильтры
            </p>
            <button
              onClick={resetFilters}
              className="cursor-pointer text-xs text-text-muted underline-offset-4 transition-colors hover:text-text-base hover:underline"
            >
              Сбросить
            </button>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">
              Поиск
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-text-faint" />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="React, API, mobile…"
                className={`${fieldCls} pl-8`}
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">
                От, ₸
              </span>
              <input
                type="number"
                min={0}
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                className={fieldCls}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">
                До, ₸
              </span>
              <input
                type="number"
                min={0}
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                className={fieldCls}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">
              Тип заказчика
            </span>
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value as ClientType)}
              className={fieldCls}
            >
              <option value="">Любой</option>
              <option value="Individual">Частный</option>
              <option value="Company">Компания</option>
              <option value="Clan">Команда</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">
              Дедлайн до
            </span>
            <input
              type="date"
              value={deadlineTo}
              onChange={(e) => setDeadlineTo(e.target.value)}
              className={fieldCls}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">
              Сортировка
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
              className={fieldCls}
            >
              <option value="newest">Сначала новые</option>
              <option value="budget_desc">Бюджет ↓</option>
              <option value="budget_asc">Бюджет ↑</option>
              <option value="deadline_asc">Ближайший дедлайн</option>
            </select>
          </label>
        </aside>

        <section className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : errMsg ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-5 text-sm text-red-300">
              {errMsg}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-card p-12 text-center">
              <p className="text-base font-medium text-text-base">
                {tab === 'liked' ? 'Пока ничего не понравилось' : 'Ничего не найдено'}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {tab === 'liked'
                  ? 'Сохраняйте интересные заказы — они появятся здесь.'
                  : 'Попробуйте изменить фильтры или сбросить их.'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {visibleItems.map((item) => (
                  <CompactProjectCard
                    key={item.id}
                    project={item}
                    liked={likedSet.has(item.id)}
                    onToggleLike={handleToggleLike}
                  />
                ))}
              </div>

              {tab === 'all' && hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="cursor-pointer rounded-md border border-border bg-bg-card px-4 py-2 text-sm text-text-base transition-colors hover:border-white/20 hover:bg-bg-elevated disabled:opacity-50"
                  >
                    {loadingMore ? 'Загрузка…' : 'Показать ещё'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
