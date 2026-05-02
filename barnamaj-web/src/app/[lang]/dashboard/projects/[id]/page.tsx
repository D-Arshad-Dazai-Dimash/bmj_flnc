'use client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  UserCheck,
  Clock,
  XCircle,
  Shield,
  Send,
  PartyPopper,
  ExternalLink,
  X,
} from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import type {
  Project,
  ApplicationWithFreelancer,
  ApplicationStatus,
  Contract,
} from '@/lib/database.types'
import Link from '@/components/ui/LocaleLink'
import { useParams } from 'next/navigation'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import confetti from 'canvas-confetti'

// ── Confetti helper ───────────────────────────────────────────
function fireConfetti() {
  const end = Date.now() + 1500
  const colors = ['#6C5CE7', '#00CECE', '#FFD166', '#FF6B6B']
  ;(function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors })
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

// ── Status badge map ──────────────────────────────────────────
const APP_STATUS: Record<ApplicationStatus, { label: string; cls: string }> = {
  pending:   { label: 'Ожидает',   cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  accepted:  { label: 'Принят',    cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  rejected:  { label: 'Отклонён',  cls: 'border-red-500/40 text-red-400 bg-red-500/10' },
  withdrawn: { label: 'Отозван',   cls: 'border-border text-text-faint' },
}

// ── Application card ──────────────────────────────────────────
const ApplicationCard = memo(function ApplicationCard({
  app,
  onAccept,
  accepting,
  projectOpen,
}: {
  app: ApplicationWithFreelancer
  onAccept: (id: string) => void
  accepting: boolean
  projectOpen: boolean
}) {
  const st = APP_STATUS[app.status] ?? APP_STATUS.pending
  return (
    <div className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="font-semibold text-text-base">
            {app.freelancer?.full_name ?? 'Неизвестный'}
          </p>
          {app.cover_letter && (
            <p className="text-sm text-text-muted line-clamp-3">{app.cover_letter}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${st.cls}`}>
          {st.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-text-faint">
        {app.proposed_budget != null && (
          <span className="flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5" />
            {app.proposed_budget.toLocaleString('ru-RU')} ₸
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {new Date(app.created_at).toLocaleDateString('ru-RU')}
        </span>
      </div>

      {app.status === 'pending' && projectOpen && (
        <div className="pt-1">
          <button
            data-testid="accept-btn"
            disabled={accepting}
            onClick={() => onAccept(app.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <UserCheck className="w-3.5 h-3.5" />
            {accepting ? 'Принимаем...' : 'Принять отклик'}
          </button>
        </div>
      )}
    </div>
  )
})

// ── Main page ─────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const params              = useParams<{ id: string }>()
  const router              = useLocaleRouter()
  const { user }            = useAuth()
  const supabase            = useMemo(() => createClient(), [])

  const [project, setProject]         = useState<Project | null>(null)
  const [apps, setApps]               = useState<ApplicationWithFreelancer[]>([])
  const [contract, setContract]       = useState<Contract | null>(null)
  const [loading, setLoading]         = useState(true)
  const [accepting, setAccepting]     = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [submitModal, setSubmitModal] = useState(false)
  const [releasing, setReleasing]     = useState(false)

  const userRole = (user as { role?: string } | null)?.role === 'client' ? 'client' : 'freelancer'

  // ── Load project + applications + contract ─────────────────
  useEffect(() => {
    if (!params.id || !user?.id) return

    async function load() {
      try {
        const [pRes, aRes, cRes] = await Promise.all([
          supabase.from('projects').select('*').eq('id', params.id).single(),
          supabase
            .from('project_applications')
            .select('*, freelancer:profiles!project_applications_freelancer_id_fkey(id, full_name, avatar_url)')
            .eq('project_id', params.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('contracts')
            .select('*')
            .eq('project_id', params.id)
            .maybeSingle(),
        ])

        if (pRes.error) { setError(pRes.error.message); return }
        setProject(pRes.data as Project)
        setApps((aRes.data ?? []) as unknown as ApplicationWithFreelancer[])
        setContract((cRes.data as Contract) ?? null)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, user?.id, supabase])

  // ── Accept application (calls DB function) ─────────────────
  const handleAccept = useCallback(async (applicationId: string) => {
    setAccepting(true)
    setError(null)

    // ① OPTIMISTIC: обновляем UI до получения ответа
    const prevApps = [...apps]
    const prevProject = project ? { ...project } : null
    const acceptedApp = apps.find(a => a.id === applicationId)

    setApps(prev =>
      prev.map(a =>
        a.id === applicationId
          ? { ...a, status: 'accepted' as const }
          : a.status === 'pending'
            ? { ...a, status: 'rejected' as const }
            : a
      )
    )
    if (project) {
      setProject({ ...project, status: 'in_progress', executor_id: acceptedApp?.freelancer_id ?? null })
    }

    try {
      // ② Вызываем атомарную DB-функцию
      const { data, error: rpcError } = await supabase.rpc('accept_application', {
        p_application_id: applicationId,
      })

      if (rpcError) {
        // ③ ROLLBACK
        setApps(prevApps)
        setProject(prevProject)
        setError((rpcError as { message: string }).message)
        return
      }

      // ④ Загружаем созданный контракт
      const { data: cData } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', data as unknown as string)
        .single()

      if (cData) setContract(cData as Contract)
    } catch {
      setApps(prevApps)
      setProject(prevProject)
      setError('Произошла ошибка при принятии отклика')
    } finally {
      setAccepting(false)
    }
  }, [apps, project, supabase])

  // ── Submit work (freelancer) ───────────────────────────────
  const handleSubmitWork = useCallback(async (url: string, description: string) => {
    if (!contract) return
    setError(null)

    try {
      const { error: rpcErr } = await supabase.rpc('submit_work', {
        p_contract_id: contract.id,
        p_url: url,
        p_description: description || undefined,
      } as { p_contract_id: string; p_url: string; p_description?: string })

      if (rpcErr) { setError((rpcErr as { message: string }).message); return }

      setContract({
        ...contract,
        work_submission_url: url,
        work_description: description || null,
        submitted_at: new Date().toISOString(),
      })
      setSubmitModal(false)
    } catch {
      setError('Не удалось отправить работу')
    }
  }, [contract, supabase])

  // ── Release payout (client) ────────────────────────────────
  const handleRelease = useCallback(async () => {
    if (!contract) return
    setReleasing(true)
    setError(null)

    // ① OPTIMISTIC
    const prevContract = { ...contract }
    const prevProject = project ? { ...project } : null
    setContract({ ...contract, status: 'completed', escrow_status: 'released', released_at: new Date().toISOString(), completed_at: new Date().toISOString() })
    if (project) setProject({ ...project, status: 'completed' })

    try {
      const { error: rpcErr } = await supabase.rpc('release_escrow_payout', {
        p_contract_id: contract.id,
      })

      if (rpcErr) {
        setContract(prevContract)
        setProject(prevProject)
        setError((rpcErr as { message: string }).message)
      } else {
        // 🎉 Конфетти!
        fireConfetti()
      }
    } catch {
      setContract(prevContract)
      setProject(prevProject)
      setError('Ошибка при выплате')
    } finally {
      setReleasing(false)
    }
  }, [contract, project, supabase])

  // ── Render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-400">
        {error ?? 'Проект не найден'}
      </div>
    )
  }

  const isOpen = project.status === 'open'
  const pendingApps = apps.filter(a => a.status === 'pending')

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* ── Back link ─────────────── */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Назад к проектам
      </Link>

      {/* ── Project header ────────── */}
      <div className="rounded-xl border border-border bg-bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-text-base">{project.title}</h1>
            {project.description && (
              <p className="text-sm text-text-muted mt-2">{project.description}</p>
            )}
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm text-text-faint">
          {project.budget != null && (
            <span className="flex items-center gap-1.5">
              <Banknote className="w-4 h-4" />
              {project.budget.toLocaleString('ru-RU')} ₸
            </span>
          )}
          {project.deadline && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(project.deadline).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
      </div>

      {/* ── Error message ─────────── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Contract info (escrow) ── */}
      {contract && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 space-y-4">
          <div className="flex items-center gap-2 text-accent-light font-semibold">
            <Shield className="w-5 h-5" />
            Контракт (Эскроу)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-text-faint">Сумма</p>
              <p className="font-medium text-text-base">{contract.amount.toLocaleString('ru-RU')} ₸</p>
            </div>
            <div>
              <p className="text-text-faint">Комиссия</p>
              <p className="font-medium text-text-base">{(contract.platform_fee ?? 0).toLocaleString('ru-RU')} ₸</p>
            </div>
            <div>
              <p className="text-text-faint">Эскроу</p>
              <EscrowBadge status={contract.escrow_status} />
            </div>
            <div>
              <p className="text-text-faint">Заморожен</p>
              <p className="font-medium text-text-base">
                {new Date(contract.frozen_at ?? '').toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>

          {/* ── Submitted work info ── */}
          {contract.submitted_at && (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-1.5">
              <p className="text-xs font-medium text-cyan-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Работа сдана
                <span className="text-text-faint font-normal ml-1">
                  {new Date(contract.submitted_at).toLocaleDateString('ru-RU')}
                </span>
              </p>
              {contract.work_description && (
                <p className="text-sm text-text-muted">{contract.work_description}</p>
              )}
              {contract.work_submission_url && (
                <a
                  href={contract.work_submission_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent-light hover:text-accent transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {contract.work_submission_url.length > 60
                    ? contract.work_submission_url.slice(0, 60) + '…'
                    : contract.work_submission_url}
                </a>
              )}
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="flex items-center gap-3">
            {/* Freelancer: submit work */}
            {userRole === 'freelancer' && contract.status === 'active' && !contract.submitted_at && (
              <button
                onClick={() => setSubmitModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-cyan-500/40 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
              >
                <Send className="w-4 h-4" /> Сдать работу
              </button>
            )}

            {/* Client: accept & pay */}
            {userRole === 'client' && contract.status === 'active' && contract.submitted_at && (
              <button
                onClick={handleRelease}
                disabled={releasing}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              >
                <PartyPopper className="w-4 h-4" />
                {releasing ? 'Выплачиваем...' : 'Принять и выплатить'}
              </button>
            )}

            {/* Completed */}
            {contract.status === 'completed' && (
              <span className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-400">
                <PartyPopper className="w-4 h-4" /> Сделка завершена
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Applications list ─────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-base">
          Отклики{' '}
          {apps.length > 0 && (
            <span className="text-sm font-normal text-text-muted">({apps.length})</span>
          )}
        </h2>

        {apps.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
            <p className="text-text-muted">Пока нет откликов</p>
            <p className="text-xs text-text-faint mt-1">
              Фрилансеры увидят ваш проект в ленте заказов
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {apps.map(a => (
              <ApplicationCard
                key={a.id}
                app={a}
                onAccept={handleAccept}
                accepting={accepting}
                projectOpen={isOpen}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>

    {/* ── Submit work modal ─────── */}
    <AnimatePresence>
      {submitModal && (
        <SubmitWorkModal
          onSubmit={handleSubmitWork}
          onClose={() => setSubmitModal(false)}
        />
      )}
    </AnimatePresence>
    </>
  )
}

// ── Small helper components ───────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open:        { label: 'Открыт',    cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
    in_progress: { label: 'В работе',  cls: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
    completed:   { label: 'Завершён',  cls: 'border-border text-text-faint' },
    cancelled:   { label: 'Отменён',   cls: 'border-red-500/40 text-red-400 bg-red-500/10' },
  }
  const st = map[status] ?? map.open
  return (
    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${st.cls}`}>
      {st.label}
    </span>
  )
}

function EscrowBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    frozen:   { label: '🔒 Заморожен', cls: 'text-amber-400' },
    released: { label: '✅ Выплачен',  cls: 'text-emerald-400' },
    refunded: { label: '↩️ Возврат',   cls: 'text-red-400' },
  }
  const st = map[status] ?? map.frozen
  return <p className={`font-medium ${st.cls}`}>{st.label}</p>
}

// ── Submit work modal ─────────────────────────────────────────
function SubmitWorkModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (url: string, description: string) => Promise<void>
  onClose: () => void
}) {
  const [url, setUrl]                 = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending]         = useState(false)

  const handleSend = async () => {
    if (!url.trim()) return
    setSending(true)
    await onSubmit(url.trim(), description.trim())
    setSending(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-bg-card p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-base">Сдать работу</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-text-faint" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-muted mb-1.5 block">
              Ссылка на результат *
            </label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full rounded-xl border border-border bg-bg-muted px-4 py-2.5 text-sm text-text-base placeholder:text-text-faint focus:border-accent focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-muted mb-1.5 block">
              Описание (необязательно)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Что было сделано..."
              className="w-full rounded-xl border border-border bg-bg-muted px-4 py-2.5 text-sm text-text-base placeholder:text-text-faint focus:border-accent focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-border text-text-muted hover:bg-bg-muted transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSend}
            disabled={!url.trim() || sending}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-xl border border-accent/40 text-accent bg-accent/10 hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Отправляем...' : 'Отправить'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
