'use client'
import { motion } from 'framer-motion'
import { FolderKanban, Plus, Banknote, Calendar, XCircle, CheckCircle2, Users } from 'lucide-react'
import { memo, useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api, type ProjectSummaryDto } from '@/lib/api'
import Link from '@/components/ui/LocaleLink'
import { Button } from '@/components/ui/button'

// Статусы от бэкенда приходят в PascalCase
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Open:        { label: 'Открыт',    cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  InProgress:  { label: 'В работе',  cls: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
  Review:      { label: 'На проверке', cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  Completed:   { label: 'Завершён',  cls: 'border-border text-text-faint' },
  Cancelled:   { label: 'Отменён',   cls: 'border-red-500/40 text-red-400 bg-red-500/10' },
}

// ── Memoized project card ───────────────────────────────────
const ProjectCard = memo(function ProjectCard({
  project: p,
  onStatusChange,
}: {
  project: ProjectSummaryDto
  onStatusChange: (id: string, status: string) => void
}) {
  const st       = STATUS_MAP[p.status] ?? STATUS_MAP['Open']
  const canCancel   = p.status === 'Open' || p.status === 'InProgress'
  const canComplete = p.status === 'InProgress'

  return (
    <div data-testid="project-card" className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/dashboard/projects/${p.id}`} className="font-semibold text-text-base truncate hover:text-accent transition-colors">
              {p.title}
            </Link>
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
        {p.status === 'Open' && p.applicationCount > 0 && (
          <Link
            href={`/dashboard/projects/${p.id}`}
            className="flex items-center gap-1.5 text-accent-light hover:text-accent transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            {p.applicationCount} {p.applicationCount === 1 ? 'отклик' : p.applicationCount < 5 ? 'отклика' : 'откликов'}
          </Link>
        )}
      </div>
      {/* Action buttons — optimistic */}
      {(canCancel || canComplete) && (
        <div className="flex items-center gap-2 pt-1">
          {canComplete && (
            <button
              onClick={() => onStatusChange(p.id, 'Completed')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Завершить
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onStatusChange(p.id, 'Cancelled')}
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
  const { user }   = useAuth()
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user?.id) return
    api.projects.list()
      .then(data => setProjects(data))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [user?.id])

  // ── Optimistic status change ──────────────────────────────
  const handleStatusChange = useCallback(async (projectId: string, newStatus: string) => {
    const prev = [...projects]
    setProjects(curr =>
      curr.map(p => p.id === projectId ? { ...p, status: newStatus } : p)
    )
    try {
      const updated = await api.projects.patchStatus(projectId, newStatus)
      setProjects(curr =>
        curr.map(p => p.id === projectId ? updated : p)
      )
    } catch {
      setProjects(prev)
    }
  }, [projects])

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
            <ProjectCard key={p.id} project={p} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </motion.div>
  )
}
