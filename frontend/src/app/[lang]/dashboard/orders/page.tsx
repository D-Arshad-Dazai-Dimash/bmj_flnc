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
            className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(73,71,171,0.28)] bg-[linear-gradient(135deg,rgba(55,111,177,0.22),rgba(73,71,171,0.26),rgba(122,88,172,0.22))] px-4 py-2 text-sm font-[510] text-[#dcdcff] transition-all duration-200 hover:brightness-110 disabled:opacity-50"
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
    <article className="rounded-[14px] border border-border bg-bg-card p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)] transition-all duration-200 hover:border-border-bright hover:bg-bg-elevated">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[17px] font-semibold text-text-base">{project.title}</h3>
          <p className="mt-1 text-xs text-text-faint">Опубликовано {new Date(project.createdAt).toLocaleDateString('ru-RU')}</p>
        </div>
        <span className="chip border-[rgba(72,152,188,0.26)] bg-[rgba(72,152,188,0.08)] text-[#9fdcec]">Открыт</span>
      </div>

      {project.description && <p className="mb-3 line-clamp-3 text-sm leading-6 text-text-secondary">{project.description}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-text-faint">
        {project.budget != null && (
          <span className="inline-flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" />{project.budget.toLocaleString('ru-RU')} ₸</span>
        )}
        {project.deadline && (
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />до {new Date(project.deadline).toLocaleDateString('ru-RU')}</span>
        )}
        <span>{project.applicationCount} откликов</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <Link
          href={`/profiles/${project.clientProfileId}`}
          className="text-sm text-[#c7d8ff] underline-offset-4 transition-colors hover:text-[#dbe6ff] hover:underline"
        >
          Профиль заказчика: {project.clientProfileName}
        </Link>

        {hasProposal ? (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[rgba(201,143,177,0.28)] bg-[rgba(201,143,177,0.08)] px-3 py-1.5 text-xs font-[510] text-[#efc7d9]">
            <Clock3 className="h-3 w-3" /> Отклик отправлен
          </span>
        ) : (
          <button
            onClick={() => onPropose(project)}
            className="rounded-[8px] border border-[rgba(73,71,171,0.25)] bg-[linear-gradient(135deg,rgba(55,111,177,0.18),rgba(73,71,171,0.22),rgba(122,88,172,0.18))] px-3 py-1.5 text-xs font-[510] text-[#dcdcff] transition-all duration-200 hover:brightness-110"
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">Лента заказов</h1>
          <p className="text-[15px] text-text-secondary">Поиск задач в стиле job-board: фильтруйте, сравнивайте, откликайтесь</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="h-fit space-y-4 rounded-[14px] border border-border bg-bg-card p-4 lg:sticky lg:top-5">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-text-base"><SlidersHorizontal className="h-4 w-4" /> Фильтры</p>
            <button onClick={resetFilters} className="text-xs text-text-faint hover:text-text-secondary">Сбросить</button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-text-secondary">Поиск</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-text-faint" />
              <input
                value={qInput}
                onChange={e => setQInput(e.target.value)}
                placeholder="Например: React, API, mobile"
                className="w-full rounded-[10px] border border-border bg-bg-elevated py-2 pl-8 pr-3 text-sm text-text-base placeholder:text-text-faint focus:border-border-focus focus:outline-none"
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-xs text-text-secondary">Бюджет от</span>
              <input
                type="number"
                min={0}
                value={minBudget}
                onChange={e => setMinBudget(e.target.value)}
                className="w-full rounded-[10px] border border-border bg-bg-elevated px-3 py-2 text-sm text-text-base focus:border-border-focus focus:outline-none"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs text-text-secondary">Бюджет до</span>
              <input
                type="number"
                min={0}
                value={maxBudget}
                onChange={e => setMaxBudget(e.target.value)}
                className="w-full rounded-[10px] border border-border bg-bg-elevated px-3 py-2 text-sm text-text-base focus:border-border-focus focus:outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-text-secondary">Тип заказчика</span>
            <select
              value={clientType}
              onChange={e => setClientType(e.target.value as ClientType)}
              className="w-full rounded-[10px] border border-border bg-bg-elevated px-3 py-2 text-sm text-text-base focus:border-border-focus focus:outline-none"
            >
              <option value="">Любой</option>
              <option value="Individual">Частный</option>
              <option value="Company">Компания</option>
              <option value="Clan">Команда</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-text-secondary">Дедлайн до</span>
            <input
              type="date"
              value={deadlineTo}
              onChange={e => setDeadlineTo(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-bg-elevated px-3 py-2 text-sm text-text-base focus:border-border-focus focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-text-secondary">Сортировка</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortValue)}
              className="w-full rounded-[10px] border border-border bg-bg-elevated px-3 py-2 text-sm text-text-base focus:border-border-focus focus:outline-none"
            >
              <option value="newest">Сначала новые</option>
              <option value="budget_desc">Бюджет по убыванию</option>
              <option value="budget_asc">Бюджет по возрастанию</option>
              <option value="deadline_asc">Ближайший дедлайн</option>
            </select>
          </label>
        </aside>

        <section className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
          ) : errMsg ? (
            <div className="rounded-[14px] border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">{errMsg}</div>
          ) : items.length === 0 ? (
            <div className="rounded-[14px] border border-border bg-bg-card p-10 text-center text-sm text-text-secondary">По этим фильтрам заказов пока нет</div>
          ) : (
            <>
              <div className="text-sm text-text-faint">Найдено: {items.length}{hasMore ? '+' : ''}</div>
              <div className="space-y-4">
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
                <div className="pt-2">
                  <button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="rounded-[10px] border border-border bg-bg-elevated px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-50"
                  >
                    {loadingMore ? 'Загрузка...' : 'Показать ещё'}
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
