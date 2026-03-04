'use client'
import { motion } from 'framer-motion'
import { FolderKanban, Plus, Banknote, Calendar, XCircle, CheckCircle2, Users } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import type { OrderType, Project, ProjectStatus } from '@/lib/database.types'
import Link from '@/components/ui/LocaleLink'
import { Button } from '@/components/ui/button'

const ORDER_TYPE_MAP: Record<OrderType, { label: string; cls: string }> = {
  PROJECT:      { label: 'Проект',       cls: 'border-violet-500/40 text-violet-400 bg-violet-500/10' },
  OUTSTAFF:     { label: 'Аутстафф',     cls: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
  AUDIT:        { label: 'Аудит',        cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  SUPERVISION:  { label: 'Технадзор',    cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  CONSULTATION: { label: 'Консультация', cls: 'border-orange-500/40 text-orange-400 bg-orange-500/10' },
}

const STATUS_MAP: Record<ProjectStatus, { label: string; cls: string }> = {
  open:        { label: 'Открыт',    cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  in_progress: { label: 'В работе',  cls: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
  completed:   { label: 'Завершён',  cls: 'border-border text-text-faint' },
  cancelled:   { label: 'Отменён',   cls: 'border-red-500/40 text-red-400 bg-red-500/10' },
}

// ── Memoized project card ───────────────────────────────────
const ProjectCard = memo(function ProjectCard({
  project: p,
  onStatusChange,
  applicationsCount,
}: {
  project: Project
  onStatusChange: (id: string, status: ProjectStatus) => void
  applicationsCount: number
}) {
  const st       = STATUS_MAP[p.status] ?? STATUS_MAP.open
  const typeInfo  = p.order_type ? ORDER_TYPE_MAP[p.order_type] : null
  const canCancel   = p.status === 'open' || p.status === 'in_progress'
  const canComplete = p.status === 'in_progress'

  return (
    <div data-testid="project-card" className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/dashboard/projects/${p.id}`} className="font-semibold text-text-base truncate hover:text-accent transition-colors">
              {p.title}
            </Link>
            {typeInfo && (
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${typeInfo.cls}`}>
                {typeInfo.label}
              </span>
            )}
          </div>
          {p.description && <p className="text-sm text-text-muted line-clamp-2">{p.description}</p>}
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${st.cls}`}>
          {st.label}
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
        {p.status === 'open' && applicationsCount > 0 && (
          <Link
            href={`/dashboard/projects/${p.id}`}
            className="flex items-center gap-1.5 text-accent-light hover:text-accent transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            {applicationsCount} {applicationsCount === 1 ? 'отклик' : applicationsCount < 5 ? 'отклика' : 'откликов'}
          </Link>
        )}
      </div>
      {/* Action buttons — optimistic */}
      {(canCancel || canComplete) && (
        <div className="flex items-center gap-2 pt-1">
          {canComplete && (
            <button
              onClick={() => onStatusChange(p.id, 'completed')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Завершить
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onStatusChange(p.id, 'cancelled')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> Отменить
            </button>
          )}
        </div>
      )}
    </div>
  )
})

export default function ProjectsPage() {
  const { user }  = useAuth()
  const supabase  = useMemo(() => createClient(), [])
  const [projects, setProjects] = useState<Project[]>([])
  const [appCounts, setAppCounts] = useState<Record<string, number>>({})
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user?.id) return

    async function load() {
      try {
        const [projRes, appsRes] = await Promise.all([
          supabase
            .from('projects')
            .select('*')
            .eq('client_id', user!.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('project_applications')
            .select('project_id')
            .eq('status', 'pending'),
        ])
        const projs = (projRes.data as Project[]) ?? []
        setProjects(projs)

        // Подсчёт откликов по проекту
        const counts: Record<string, number> = {}
        for (const a of (appsRes.data ?? []) as { project_id: string }[]) {
          counts[a.project_id] = (counts[a.project_id] || 0) + 1
        }
        setAppCounts(counts)
      } catch {
        setProjects([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, supabase])

  // ── Optimistic status change ──────────────────────────────
  const handleStatusChange = useCallback(async (projectId: string, newStatus: ProjectStatus) => {
    // ① Snapshot for rollback
    const prev = projects.map(p => ({ ...p }))

    // ② OPTIMISTIC: мгновенно обновляем UI
    setProjects(curr =>
      curr.map(p => p.id === projectId ? { ...p, status: newStatus } : p)
    )

    try {
      // ③ Фоновый запрос
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId)

      if (error) {
        // ④ ROLLBACK
        setProjects(prev)
        console.error('[Optimistic] rollback:', error.message)
      }
    } catch {
      setProjects(prev)
    }
  }, [projects, supabase])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/15"><FolderKanban className="w-5 h-5 text-cyan-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-text-base">Мои проекты</h1>
            <p className="text-sm text-text-muted">Управление вашими проектами</p>
          </div>
        </div>
        <Link href="/dashboard/create-project">
          <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Новый проект</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-12 flex flex-col items-center gap-3 text-center">
          <FolderKanban className="w-10 h-10 text-text-faint" />
          <p className="text-text-muted">У вас пока нет проектов</p>
          <p className="text-xs text-text-faint max-w-xs">Создайте ТЗ и начните поиск подходящей команды разработчиков</p>
          <Link href="/dashboard/create-project"><Button size="sm" className="mt-2">Создать проект</Button></Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onStatusChange={handleStatusChange} applicationsCount={appCounts[p.id] ?? 0} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

