'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Calendar, Banknote, Star, Filter, X, Send, Clock } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import type { OrderType, ProjectWithClient } from '@/lib/database.types'

// ── Order type display map ───────────────────────────────────────────────────
const ORDER_TYPE_MAP: Record<OrderType, { label: string; cls: string }> = {
  PROJECT:      { label: 'Проект',       cls: 'border-violet-500/40 text-violet-400 bg-violet-500/10' },
  OUTSTAFF:     { label: 'Аутстафф',     cls: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
  AUDIT:        { label: 'Аудит',        cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  SUPERVISION:  { label: 'Технадзор',    cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  CONSULTATION: { label: 'Консультация', cls: 'border-orange-500/40 text-orange-400 bg-orange-500/10' },
}

// ── Proposal modal ──────────────────────────────────────────────────────────
function ProposalModal({ project, onClose, onSubmit }: {
  project: ProjectWithClient
  onClose: () => void
  onSubmit: (data: { coverLetter: string; proposedBudget: number | null; deadlineDays: number | null }) => void
}) {
  const [coverLetter, setCoverLetter] = useState('')
  const [budget, setBudget] = useState('')
  const [days, setDays] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = () => {
    setSending(true)
    onSubmit({
      coverLetter: coverLetter.trim(),
      proposedBudget: budget ? Number(budget) : null,
      deadlineDays: days ? Number(days) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-base">Подать предложение</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bg-hover transition-colors">
            <X className="w-5 h-5 text-text-faint" />
          </button>
        </div>
        <p className="text-sm text-text-muted truncate">{project.title}</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-faint block mb-1">Сопроводительное письмо</label>
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value.slice(0, 500))}
              placeholder="Расскажите почему вы подходите..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-bg-base border border-border text-sm text-text-base placeholder:text-text-faint resize-none focus:outline-none focus:border-accent transition-colors"
            />
            <span className="text-xs text-text-faint">{coverLetter.length}/500</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-faint block mb-1">Ваша цена (₸)</label>
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder={project.budget ? String(project.budget) : '—'}
                className="w-full px-3 py-2 rounded-lg bg-bg-base border border-border text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-faint block mb-1">Срок (дней)</label>
              <input
                type="number"
                value={days}
                onChange={e => setDays(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-2 rounded-lg bg-bg-base border border-border text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-text-muted hover:bg-bg-hover transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-accent/40 text-accent-light bg-accent/10 hover:bg-accent/20 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Отправляем...' : 'Отправить'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Memoized order card ─────────────────────────────────────────────────────
const OrderCard = memo(function OrderCard({
  project: p,
  onApply,
  onToggleFavorite,
  onPropose,
  isFavorite,
  hasProposal,
  applyingId,
}: {
  project: ProjectWithClient
  onApply: (id: string) => void
  onToggleFavorite: (id: string) => void
  onPropose: (p: ProjectWithClient) => void
  isFavorite: boolean
  hasProposal: boolean
  applyingId: string | null
}) {
  const typeInfo = p.order_type ? ORDER_TYPE_MAP[p.order_type] : null

  return (
    <div data-testid="order-card" className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-base truncate">{p.title}</h3>
            {typeInfo && (
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${typeInfo.cls}`}>
                {typeInfo.label}
              </span>
            )}
          </div>
          {p.description && <p className="text-sm text-text-muted line-clamp-2">{p.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggleFavorite(p.id)}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
            title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-text-faint'}`} />
          </button>
          <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
            Открыт
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-faint">
        {p.budget != null && (
          <span className="flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5" />
            {p.budget.toLocaleString('ru-RU')} ₸
          </span>
        )}
        {p.deadline && (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(p.deadline).toLocaleDateString('ru-RU')}
          </span>
        )}
        {p.client && (
          <span className="text-text-faint">
            от <span className="text-text-muted">{p.client.full_name}</span>
          </span>
        )}
      </div>
      <div className="pt-1 flex items-center gap-2">
        {hasProposal ? (
          <span className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/40 text-amber-400 bg-amber-500/10 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Предложение отправлено
          </span>
        ) : (
          <>
            <button
              data-testid="apply-btn"
              disabled={applyingId === p.id}
              onClick={() => onApply(p.id)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-accent/40 text-accent-light bg-accent/10 hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              {applyingId === p.id ? 'Отправляем...' : 'Откликнуться'}
            </button>
            <button
              onClick={() => onPropose(p)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-cyan-500/40 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
            >
              Подать предложение
            </button>
          </>
        )}
      </div>
    </div>
  )
})

export default function OrdersPage() {
  const { user }  = useAuth()
  const supabase  = useMemo(() => createClient(), [])
  const [allProjects, setAllProjects] = useState<ProjectWithClient[]>([])
  const [typeFilter,  setTypeFilter]  = useState<OrderType | 'all'>('all')
  const [loading,     setLoading]     = useState(true)
  const [errMsg,      setErrMsg]      = useState<string | null>(null)
  const [applyingId,  setApplyingId]  = useState<string | null>(null)

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [showFavOnly, setShowFavOnly] = useState(false)

  // Proposals — set of project IDs where user already has a proposal
  const [proposalIds, setProposalIds] = useState<Set<string>>(new Set())

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  // Proposal modal
  const [proposalTarget, setProposalTarget] = useState<ProjectWithClient | null>(null)

  // Keep snapshot for rollback on optimistic update failure
  const snapshotRef = useRef<ProjectWithClient[]>([])

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, client:profiles!projects_client_id_fkey(full_name, avatar_url)')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(50)
        if (error) { setErrMsg(error.message); return }
        const result = (data as unknown as ProjectWithClient[]) ?? []
        setAllProjects(result)
        snapshotRef.current = result

        // Load favorites + existing proposals in parallel
        if (user?.id) {
          const [favRes, appRes] = await Promise.all([
            supabase.from('favorites').select('project_id').eq('user_id', user.id),
            supabase.from('project_applications').select('project_id').eq('freelancer_id', user.id),
          ])
          if (favRes.data) setFavoriteIds(new Set(favRes.data.map(f => f.project_id)))
          if (appRes.data) setProposalIds(new Set(appRes.data.map(a => a.project_id)))
        }
      } catch (e: unknown) {
        setErrMsg(e instanceof Error ? e.message : 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase, user?.id])

  // Apply filters client-side
  const projects = useMemo(() => {
    let filtered = allProjects

    if (typeFilter !== 'all') filtered = filtered.filter(p => p.order_type === typeFilter)
    if (showFavOnly) filtered = filtered.filter(p => favoriteIds.has(p.id))
    if (minAmount) filtered = filtered.filter(p => (p.budget ?? 0) >= Number(minAmount))
    if (maxAmount) filtered = filtered.filter(p => (p.budget ?? 0) <= Number(maxAmount))
    if (dateFrom) filtered = filtered.filter(p => p.created_at >= dateFrom)
    if (dateTo) filtered = filtered.filter(p => p.created_at <= dateTo + 'T23:59:59')

    return filtered
  }, [allProjects, typeFilter, showFavOnly, favoriteIds, minAmount, maxAmount, dateFrom, dateTo])

  // ── Toggle favorite ──────────────────────────────────────────
  const handleToggleFavorite = useCallback(async (projectId: string) => {
    if (!user?.id) return
    const isFav = favoriteIds.has(projectId)

    // Optimistic
    setFavoriteIds(prev => {
      const next = new Set(prev)
      if (isFav) next.delete(projectId)
      else next.add(projectId)
      return next
    })

    if (isFav) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('project_id', projectId)
      if (error) {
        setFavoriteIds(prev => { const next = new Set(prev); next.add(projectId); return next })
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, project_id: projectId })
      if (error) {
        setFavoriteIds(prev => { const next = new Set(prev); next.delete(projectId); return next })
      }
    }
  }, [user?.id, favoriteIds, supabase])

  // ── Quick apply (simple, no cover letter) ────────────────────
  const handleApply = useCallback(async (projectId: string) => {
    if (!user?.id) return

    const prevAll = [...allProjects]
    snapshotRef.current = prevAll

    setAllProjects(prev => prev.filter(p => p.id !== projectId))
    setApplyingId(projectId)

    try {
      const { error } = await supabase
        .from('project_applications')
        .insert({
          project_id:    projectId,
          freelancer_id: user.id,
        })

      if (error) {
        setAllProjects(prevAll)
        console.error('[Optimistic] rollback:', error.message)
      } else {
        setProposalIds(prev => new Set(prev).add(projectId))
      }
    } catch {
      setAllProjects(prevAll)
    } finally {
      setApplyingId(null)
    }
  }, [user?.id, allProjects, supabase])

  // ── Submit detailed proposal ─────────────────────────────────
  const handleProposalSubmit = useCallback(async (data: { coverLetter: string; proposedBudget: number | null; deadlineDays: number | null }) => {
    if (!user?.id || !proposalTarget) return

    const projectId = proposalTarget.id
    const prevAll = [...allProjects]

    setAllProjects(prev => prev.filter(p => p.id !== projectId))
    setProposalTarget(null)

    try {
      const { error } = await supabase
        .from('project_applications')
        .insert({
          project_id:      projectId,
          freelancer_id:   user.id,
          cover_letter:    data.coverLetter || null,
          proposed_budget: data.proposedBudget,
          deadline_days:   data.deadlineDays,
        })

      if (error) {
        setAllProjects(prevAll)
        console.error('[Proposal] error:', error.message)
      } else {
        setProposalIds(prev => new Set(prev).add(projectId))
      }
    } catch {
      setAllProjects(prevAll)
    }
  }, [user?.id, proposalTarget, allProjects, supabase])

  const clearFilters = () => {
    setMinAmount('')
    setMaxAmount('')
    setDateFrom('')
    setDateTo('')
    setShowFavOnly(false)
    setTypeFilter('all')
  }

  const hasActiveFilters = minAmount || maxAmount || dateFrom || dateTo || showFavOnly || typeFilter !== 'all'

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="space-y-6">
      {/* Header + filter controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/15"><ClipboardList className="w-5 h-5 text-cyan-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-text-base">Лента заказов</h1>
            <p className="text-sm text-text-muted">Актуальные заказы от клиентов</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFavOnly(!showFavOnly)}
            className={`p-2 rounded-lg border transition-colors ${showFavOnly ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' : 'border-border bg-bg-card text-text-faint hover:text-text-muted'}`}
            title="Только избранные"
          >
            <Star className={`w-4 h-4 ${showFavOnly ? 'fill-yellow-400' : ''}`} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${showFilters ? 'border-accent/40 bg-accent/10 text-accent-light' : 'border-border bg-bg-card text-text-faint hover:text-text-muted'}`}
            title="Фильтры"
          >
            <Filter className="w-4 h-4" />
          </button>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as OrderType | 'all')}
            className="px-3 py-2 rounded-lg bg-bg-card border border-border text-sm text-text-base focus:outline-none focus:border-accent transition-colors"
          >
            <option value="all">Все типы</option>
            {(Object.keys(ORDER_TYPE_MAP) as OrderType[]).map(k => (
              <option key={k} value={k}>{ORDER_TYPE_MAP[k].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-text-faint">Фильтры</span>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-accent-light hover:underline">Сбросить</button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-text-faint block mb-1">Мин. бюджет (₸)</label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-lg bg-bg-base border border-border text-sm text-text-base focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-faint block mb-1">Макс. бюджет (₸)</label>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    placeholder="∞"
                    className="w-full px-3 py-1.5 rounded-lg bg-bg-base border border-border text-sm text-text-base focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-faint block mb-1">Дата от</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-bg-base border border-border text-sm text-text-base focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-faint block mb-1">Дата до</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-bg-base border border-border text-sm text-text-base focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : errMsg ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-400">{errMsg}</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-12 flex flex-col items-center gap-3 text-center">
          <ClipboardList className="w-10 h-10 text-text-faint" />
          <p className="text-text-muted">
            {hasActiveFilters ? 'По фильтрам ничего не найдено' : 'Открытых заказов пока нет'}
          </p>
          <p className="text-xs text-text-faint max-w-xs">
            {hasActiveFilters
              ? 'Попробуйте изменить параметры фильтров'
              : 'Возвращайтесь позже — здесь появятся актуальные заказы от клиентов.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(p => (
            <OrderCard
              key={p.id}
              project={p}
              onApply={handleApply}
              onToggleFavorite={handleToggleFavorite}
              onPropose={setProposalTarget}
              isFavorite={favoriteIds.has(p.id)}
              hasProposal={proposalIds.has(p.id)}
              applyingId={applyingId}
            />
          ))}
        </div>
      )}

      {/* Proposal modal */}
      <AnimatePresence>
        {proposalTarget && (
          <ProposalModal
            project={proposalTarget}
            onClose={() => setProposalTarget(null)}
            onSubmit={handleProposalSubmit}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
