'use client'
import { motion } from 'framer-motion'
import { ClipboardList, Calendar, Banknote } from 'lucide-react'
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

// ── Memoized order card — prevents full grid re-render on state change ──
const OrderCard = memo(function OrderCard({
  project: p,
  onApply,
  applyingId,
}: {
  project: ProjectWithClient
  onApply: (id: string) => void
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
        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
          Открыт
        </span>
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
      <div className="pt-1">
        <button
          data-testid="apply-btn"
          disabled={applyingId === p.id}
          onClick={() => onApply(p.id)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-accent/40 text-accent-light bg-accent/10 hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          {applyingId === p.id ? 'Отправляем...' : 'Откликнуться'}
        </button>
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
      } catch (e: unknown) {
        setErrMsg(e instanceof Error ? e.message : 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  // Apply filter client-side (instant, no extra DB request)
  const projects = useMemo(
    () => typeFilter === 'all' ? allProjects : allProjects.filter(p => p.order_type === typeFilter),
    [allProjects, typeFilter],
  )

  // ── Optimistic "Откликнуться" ──────────────────────────────
  const handleApply = useCallback(async (projectId: string) => {
    if (!user?.id) return

    const prevAll = [...allProjects]
    snapshotRef.current = prevAll

    // ① OPTIMISTIC: убираем из ленты (уже откликнулись)
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
        // ② ROLLBACK
        setAllProjects(prevAll)
        console.error('[Optimistic] rollback:', error.message)
      }
    } catch {
      setAllProjects(prevAll)
    } finally {
      setApplyingId(null)
    }
  }, [user?.id, allProjects, supabase])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="space-y-6">
      {/* Header + filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/15"><ClipboardList className="w-5 h-5 text-cyan-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-text-base">Лента заказов</h1>
            <p className="text-sm text-text-muted">Актуальные заказы от клиентов</p>
          </div>
        </div>

        {/* Type filter */}
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
            {typeFilter === 'all' ? 'Открытых заказов пока нет' : `Нет заказов типа «${ORDER_TYPE_MAP[typeFilter].label}»`}
          </p>
          <p className="text-xs text-text-faint max-w-xs">Возвращайтесь позже — здесь появятся актуальные заказы от клиентов.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(p => (
            <OrderCard
              key={p.id}
              project={p}
              onApply={handleApply}
              applyingId={applyingId}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
