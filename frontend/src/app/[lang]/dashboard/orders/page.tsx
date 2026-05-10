'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, Calendar, Banknote, Clock3, Send, X } from 'lucide-react'
import { api, ApiError, type ProjectSummaryDto } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import Link from '@/components/ui/LocaleLink'

type SortValue = 'newest' | 'budget_asc' | 'budget_desc' | 'deadline_asc'
type ClientType = 'Individual' | 'Company' | 'Clan' | ''

function ProposalModal({
  project,
  onClose,
  onSubmit,
  sending,
}: {
  project: ProjectSummaryDto
  onClose: () => void
  onSubmit: (data: { coverLetter: string; proposedBudget: number | null }) => void
  sending: boolean
}) {
  const [coverLetter, setCoverLetter] = useState('')
  const [budget, setBudget] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="w-full max-w-lg rounded-[18px] border border-border bg-bg-card p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-base">Отклик на заказ</h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-[8px] border border-transparent p-1.5 text-text-faint transition-colors hover:border-border hover:bg-bg-hover"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 truncate text-sm text-text-secondary">{project.title}</p>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-text-secondary">Сопроводительное письмо</span>
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value.slice(0, 500))}
              rows={4}
              className="w-full resize-none rounded-[10px] border border-border bg-bg-elevated px-3 py-2.5 text-sm text-text-base placeholder:text-text-faint focus:border-border-focus focus:outline-none"
              placeholder="Опишите релевантный опыт и подход к задаче"
            />
            <span className="text-xs text-text-faint">{coverLetter.length}/500</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-text-secondary">Предложенная цена (₸)</span>
            <input
              type="number"
              min={0}
              value={budget}
              onChange={e => setBudget(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-bg-elevated px-3 py-2.5 text-sm text-text-base placeholder:text-text-faint focus:border-border-focus focus:outline-none"
              placeholder={project.budget != null ? String(project.budget) : 'Например 200000'}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-[8px] border border-border bg-bg-elevated px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Отмена
          </button>
          <button
            onClick={() => onSubmit({ coverLetter: coverLetter.trim(), proposedBudget: budget ? Number(budget) : null })}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-150 hover:bg-white/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? 'Отправляем...' : 'Отправить отклик'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function ProjectCard({
  project,
  hasProposal,
  onPropose,
}: {
  project: ProjectSummaryDto
  hasProposal: boolean
  onPropose: (project: ProjectSummaryDto) => void
}) {
  return (
    <article className="group rounded-xl border border-border bg-bg-card p-6 transition-all duration-150 hover:border-white/20 hover:bg-bg-elevated">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[17px] font-semibold tracking-tight text-text-base">{project.title}</h3>
          <p className="mt-1 text-xs text-text-faint">{new Date(project.createdAt).toLocaleDateString('ru-RU')}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Открыт
        </span>
      </div>

      {project.description && <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-text-secondary">{project.description}</p>}

      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
        {project.budget != null && (
          <span className="inline-flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /><span className="font-medium text-text-base">{project.budget.toLocaleString('ru-RU')} ₸</span></span>
        )}
        {project.deadline && (
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />до {new Date(project.deadline).toLocaleDateString('ru-RU')}</span>
        )}
        <span className="inline-flex items-center gap-1.5">{project.applicationCount} откликов</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Link
          href={`/profiles/${project.clientProfileId}`}
          className="text-sm text-text-secondary underline-offset-4 transition-colors hover:text-text-base hover:underline"
        >
          {project.clientProfileName}
        </Link>

        {hasProposal ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-muted">
            <Clock3 className="h-3 w-3" /> Отклик отправлен
          </span>
        ) : (
          <button
            onClick={() => onPropose(project)}
            className="rounded-md bg-white px-3.5 py-1.5 text-xs font-medium text-black transition-colors duration-150 hover:bg-white/90"
          >
            Откликнуться
          </button>
        )}
      </div>
    </article>
  )
}

export default function OrdersPage() {
  const { user, isAuthenticated } = useAuth()

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

  const [proposalTarget, setProposalTarget] = useState<ProjectSummaryDto | null>(null)
  const [sending, setSending] = useState(false)
  const [proposalIds, setProposalIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(qInput.trim()), 350)
    return () => clearTimeout(t)
  }, [qInput])

  const feedQuery = useMemo(() => ({
    q: qDebounced || undefined,
    minBudget: minBudget ? Number(minBudget) : undefined,
    maxBudget: maxBudget ? Number(maxBudget) : undefined,
    deadlineTo: deadlineTo || undefined,
    clientType: clientType || undefined,
    sort,
  }), [qDebounced, minBudget, maxBudget, deadlineTo, clientType, sort])

  const load = useCallback(async (targetPage: number, append: boolean) => {
    setErrMsg(null)
    if (append) setLoadingMore(true)
    else setLoading(true)

    try {
      const data = await api.projects.feed({ ...feedQuery, page: targetPage, pageSize: 20 })
      setItems(prev => (append ? [...prev, ...data] : data))
      setHasMore(data.length === 20)
    } catch (e) {
      setErrMsg(e instanceof ApiError ? e.message : 'Ошибка загрузки ленты заказов')
      if (!append) setItems([])
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [feedQuery])

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

  const handleProposalSubmit = useCallback(async (data: { coverLetter: string; proposedBudget: number | null }) => {
    if (!isAuthenticated || !user?.profileId || !proposalTarget) {
      setErrMsg('Войдите в аккаунт исполнителя, чтобы отправлять отклики.')
      return
    }

    setSending(true)
    try {
      await api.projects.apply(proposalTarget.id, {
        applicantProfileId: user.profileId,
        coverLetter: data.coverLetter || undefined,
        proposedBudget: data.proposedBudget ?? undefined,
      })
      setProposalIds(prev => new Set(prev).add(proposalTarget.id))
      setProposalTarget(null)
    } catch (e) {
      setErrMsg(e instanceof ApiError ? e.message : 'Не удалось отправить отклик')
    } finally {
      setSending(false)
    }
  }, [isAuthenticated, proposalTarget, user?.profileId])

  // Vercel-style: монохром, тонкие границы, белая primary-кнопка, чистая типографика
  const fieldCls = 'w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-base placeholder:text-text-faint transition-colors focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/10'

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8">
        <div>
          <h1 className="text-[34px] font-semibold tracking-[-0.02em] text-text-base">Лента заказов</h1>
          <p className="mt-2 text-[15px] text-text-muted">Найдите подходящие проекты — фильтруйте по бюджету, сроку и типу заказчика.</p>
        </div>
        {!loading && items.length > 0 && (
          <span className="text-xs text-text-muted">{items.length}{hasMore ? '+' : ''} результатов</span>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit space-y-5 rounded-xl border border-border bg-bg-card p-5 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-text-base"><SlidersHorizontal className="h-4 w-4" /> Фильтры</p>
            <button onClick={resetFilters} className="text-xs text-text-muted underline-offset-4 transition-colors hover:text-text-base hover:underline">Сбросить</button>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">Поиск</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-text-faint" />
              <input
                value={qInput}
                onChange={e => setQInput(e.target.value)}
                placeholder="React, API, mobile…"
                className={`${fieldCls} pl-8`}
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">От, ₸</span>
              <input type="number" min={0} value={minBudget} onChange={e => setMinBudget(e.target.value)} className={fieldCls} />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">До, ₸</span>
              <input type="number" min={0} value={maxBudget} onChange={e => setMaxBudget(e.target.value)} className={fieldCls} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">Тип заказчика</span>
            <select value={clientType} onChange={e => setClientType(e.target.value as ClientType)} className={fieldCls}>
              <option value="">Любой</option>
              <option value="Individual">Частный</option>
              <option value="Company">Компания</option>
              <option value="Clan">Команда</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">Дедлайн до</span>
            <input type="date" value={deadlineTo} onChange={e => setDeadlineTo(e.target.value)} className={fieldCls} />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-faint">Сортировка</span>
            <select value={sort} onChange={e => setSort(e.target.value as SortValue)} className={fieldCls}>
              <option value="newest">Сначала новые</option>
              <option value="budget_desc">Бюджет ↓</option>
              <option value="budget_asc">Бюджет ↑</option>
              <option value="deadline_asc">Ближайший дедлайн</option>
            </select>
          </label>
        </aside>

        <section className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" /></div>
          ) : errMsg ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-5 text-sm text-red-300">{errMsg}</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-card p-12 text-center">
              <p className="text-base font-medium text-text-base">Ничего не найдено</p>
              <p className="mt-1 text-sm text-text-muted">Попробуйте изменить фильтры или сбросить их</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map(item => (
                  <ProjectCard
                    key={item.id}
                    project={item}
                    hasProposal={proposalIds.has(item.id)}
                    onPropose={setProposalTarget}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-4">
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
        </section>
      </div>

      <AnimatePresence>
        {proposalTarget && (
          <ProposalModal
            project={proposalTarget}
            onClose={() => setProposalTarget(null)}
            onSubmit={handleProposalSubmit}
            sending={sending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
