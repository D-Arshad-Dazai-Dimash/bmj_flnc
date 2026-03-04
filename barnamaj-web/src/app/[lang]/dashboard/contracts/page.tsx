'use client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Banknote,
  Clock,
  ArrowRight,
  Send,
  PartyPopper,
  X,
  ExternalLink,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import type { ContractStatus, EscrowStatus } from '@/lib/database.types'
import Link from '@/components/ui/LocaleLink'
import confetti from 'canvas-confetti'

// ── Types ─────────────────────────────────────────────────────
interface ContractRow {
  id: string
  created_at: string
  project_id: string
  client_id: string
  freelancer_id: string
  amount: number
  platform_fee: number
  escrow_status: EscrowStatus
  status: ContractStatus
  frozen_at: string
  released_at: string | null
  completed_at: string | null
  work_submission_url: string | null
  work_description: string | null
  submitted_at: string | null
  project: { id: string; title: string } | null
  client_profile: { full_name: string } | null
  freelancer_profile: { full_name: string } | null
}

// ── Status maps ───────────────────────────────────────────────
const CONTRACT_STATUS: Record<ContractStatus, { label: string; cls: string }> = {
  active:    { label: 'Активный',   cls: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
  completed: { label: 'Завершён',   cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  disputed:  { label: 'Спор',       cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  cancelled: { label: 'Отменён',    cls: 'border-red-500/40 text-red-400 bg-red-500/10' },
}

const ESCROW_STATUS: Record<EscrowStatus, { label: string; cls: string }> = {
  frozen:   { label: '🔒 Заморожен', cls: 'text-amber-400' },
  released: { label: '✅ Выплачен',  cls: 'text-emerald-400' },
  refunded: { label: '↩️ Возврат',   cls: 'text-red-400' },
}

// ── Fire confetti burst ───────────────────────────────────────
function fireConfetti() {
  const end = Date.now() + 1500
  const colors = ['#6d28d9', '#22d3ee', '#10b981', '#f59e0b', '#ec4899']

  ;(function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

// ── Submit Work Modal ─────────────────────────────────────────
function SubmitWorkModal({
  contract,
  onClose,
  onSubmitted,
}: {
  contract: ContractRow
  onClose: () => void
  onSubmitted: (c: ContractRow) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setSending(true)
    setError(null)

    try {
      const { error: rpcErr } = await supabase.rpc('submit_work', {
        p_contract_id: contract.id,
        p_url: url.trim(),
        p_description: description.trim() || undefined,
      } as { p_contract_id: string; p_url: string; p_description?: string })

      if (rpcErr) {
        setError(rpcErr.message)
        return
      }

      onSubmitted({
        ...contract,
        work_submission_url: url.trim(),
        work_description: description.trim() || null,
        submitted_at: new Date().toISOString(),
      })
      onClose()
    } catch {
      setError('Не удалось отправить работу')
    } finally {
      setSending(false)
    }
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
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-bg-surface p-6 space-y-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/15">
              <Send className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-base">Сдать работу</h2>
              <p className="text-xs text-text-muted">{contract.project?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors">
            <X className="w-5 h-5 text-text-faint" />
          </button>
        </div>

        {/* Escrow info */}
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 flex items-center justify-between">
          <div className="text-sm text-text-muted">Сумма эскроу</div>
          <div className="text-lg font-bold text-accent-light">
            {contract.amount.toLocaleString('ru-RU')} ₸
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-base">
              Ссылка на результат <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://github.com/… или https://vercel.app/…"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg-card text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-base">Описание работы</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Кратко опишите, что было сделано…"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg-card text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !url.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Отправляем...' : 'Сдать работу'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Contract card ─────────────────────────────────────────────
const ContractCard = memo(function ContractCard({
  c,
  userRole,
  onOpenSubmit,
  onRelease,
  releasing,
}: {
  c: ContractRow
  userRole: 'client' | 'freelancer'
  onOpenSubmit: (c: ContractRow) => void
  onRelease: (c: ContractRow) => void
  releasing: string | null
}) {
  const cSt = CONTRACT_STATUS[c.status] ?? CONTRACT_STATUS.active
  const eSt = ESCROW_STATUS[c.escrow_status] ?? ESCROW_STATUS.frozen
  const counterparty =
    userRole === 'client'
      ? c.freelancer_profile?.full_name ?? 'Исполнитель'
      : c.client_profile?.full_name ?? 'Заказчик'

  const isActive     = c.status === 'active'
  const isSubmitted  = !!c.submitted_at
  const isCompleted  = c.status === 'completed'

  // Freelancer: can submit if active and not yet submitted
  const canSubmit = userRole === 'freelancer' && isActive && !isSubmitted
  // Client: can release if active and work submitted
  const canRelease = userRole === 'client' && isActive && isSubmitted

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/dashboard/projects/${c.project_id}`}
            className="font-semibold text-text-base hover:text-accent transition-colors truncate block"
          >
            {c.project?.title ?? 'Проект'}
          </Link>
          <p className="text-sm text-text-muted">
            {userRole === 'client' ? 'Исполнитель' : 'Заказчик'}:{' '}
            <span className="text-text-base">{counterparty}</span>
          </p>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${cSt.cls}`}>
          {cSt.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-5 text-sm text-text-faint">
        <span className="flex items-center gap-1.5">
          <Banknote className="w-4 h-4" />
          {c.amount.toLocaleString('ru-RU')} ₸
        </span>
        <span className={`font-medium ${eSt.cls}`}>{eSt.label}</span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {new Date(c.frozen_at).toLocaleDateString('ru-RU')}
        </span>
      </div>

      {/* ── Submitted info ── */}
      {isSubmitted && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-1.5">
          <p className="text-xs font-medium text-cyan-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Работа сдана
            <span className="text-text-faint font-normal ml-1">
              {new Date(c.submitted_at!).toLocaleDateString('ru-RU')}
            </span>
          </p>
          {c.work_description && (
            <p className="text-sm text-text-muted">{c.work_description}</p>
          )}
          {c.work_submission_url && (
            <a
              href={c.work_submission_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent-light hover:text-accent transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {c.work_submission_url.length > 50
                ? c.work_submission_url.slice(0, 50) + '…'
                : c.work_submission_url}
            </a>
          )}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex items-center gap-2 pt-1">
        {canSubmit && (
          <button
            onClick={() => onOpenSubmit(c)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-cyan-500/40 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> Сдать работу
          </button>
        )}

        {canRelease && (
          <button
            onClick={() => onRelease(c)}
            disabled={releasing === c.id}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <PartyPopper className="w-3.5 h-3.5" />
            {releasing === c.id ? 'Выплачиваем...' : 'Принять и выплатить'}
          </button>
        )}

        {isCompleted && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400">
            <PartyPopper className="w-3.5 h-3.5" /> Сделка завершена
          </span>
        )}

        <Link
          href={`/dashboard/contracts/${c.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors ml-auto"
        >
          <MessageSquare className="w-3.5 h-3.5" /> Чат
        </Link>
        <Link
          href={`/dashboard/projects/${c.project_id}`}
          className="inline-flex items-center gap-1.5 text-xs text-accent-light hover:text-accent transition-colors"
        >
          Проект <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
})

// ── Main page ─────────────────────────────────────────────────
export default function ContractsPage() {
  const { user }   = useAuth()
  const supabase   = useMemo(() => createClient(), [])
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [submitModal, setSubmitModal] = useState<ContractRow | null>(null)
  const [releasing, setReleasing]     = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)

  const userRole = (user as { role?: string } | null)?.role === 'client' ? 'client' : 'freelancer'

  useEffect(() => {
    if (!user?.id) return

    async function load() {
      try {
        const { data } = await supabase
          .from('contracts')
          .select(`
            *,
            project:projects!contracts_project_id_fkey(id, title),
            client_profile:profiles!contracts_client_id_fkey(full_name),
            freelancer_profile:profiles!contracts_freelancer_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false })

        setContracts((data ?? []) as unknown as ContractRow[])
      } catch {
        setContracts([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, supabase])

  // ── Submit work callback ───────────────────────────────────
  const handleSubmitted = useCallback((updated: ContractRow) => {
    setContracts(prev => prev.map(c => c.id === updated.id ? updated : c))
  }, [])

  // ── Release payout callback ────────────────────────────────
  const handleRelease = useCallback(async (contract: ContractRow) => {
    setReleasing(contract.id)
    setError(null)

    // ① OPTIMISTIC
    const prev = contracts.map(c => ({ ...c }))
    setContracts(cs =>
      cs.map(c =>
        c.id === contract.id
          ? { ...c, status: 'completed' as const, escrow_status: 'released' as const, released_at: new Date().toISOString(), completed_at: new Date().toISOString() }
          : c
      )
    )

    try {
      const { error: rpcErr } = await supabase.rpc('release_escrow_payout', {
        p_contract_id: contract.id,
      })

      if (rpcErr) {
        setContracts(prev)
        setError(rpcErr.message)
      } else {
        // 🎉 Конфетти!
        fireConfetti()
      }
    } catch {
      setContracts(prev)
      setError('Ошибка при выплате')
    } finally {
      setReleasing(null)
    }
  }, [contracts, supabase])

  // ── Stats ──────────────────────────────────────────────────
  const activeCount = contracts.filter(c => c.status === 'active').length
  const frozenTotal = contracts
    .filter(c => c.escrow_status === 'frozen')
    .reduce((sum, c) => sum + c.amount, 0)
  const releasedTotal = contracts
    .filter(c => c.escrow_status === 'released')
    .reduce((sum, c) => sum + c.amount, 0)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="space-y-6"
      >
        {/* ── Header ─────────────────── */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/15">
            <Shield className="w-5 h-5 text-accent-light" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-base">Контракты</h1>
            <p className="text-sm text-text-muted">Управление эскроу-контрактами</p>
          </div>
        </div>

        {/* ── Summary cards ──────────── */}
        {contracts.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
              <p className="text-2xl font-bold text-accent-light">{activeCount}</p>
              <p className="text-xs text-text-muted mt-1">Активных</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">
                {frozenTotal.toLocaleString('ru-RU')} ₸
              </p>
              <p className="text-xs text-text-muted mt-1">Заморожено</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {releasedTotal.toLocaleString('ru-RU')} ₸
              </p>
              <p className="text-xs text-text-muted mt-1">Выплачено</p>
            </div>
          </div>
        )}

        {/* ── Error ────────────────── */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── List ───────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-card p-12 flex flex-col items-center gap-3 text-center">
            <Shield className="w-10 h-10 text-text-faint" />
            <p className="text-text-muted">Контрактов пока нет</p>
            <p className="text-xs text-text-faint max-w-xs">
              Контракт создаётся автоматически, когда заказчик принимает отклик на проект.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {contracts.map(c => (
              <ContractCard
                key={c.id}
                c={c}
                userRole={userRole}
                onOpenSubmit={setSubmitModal}
                onRelease={handleRelease}
                releasing={releasing}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Submit Work Modal ──────── */}
      <AnimatePresence>
        {submitModal && (
          <SubmitWorkModal
            contract={submitModal}
            onClose={() => setSubmitModal(null)}
            onSubmitted={handleSubmitted}
          />
        )}
      </AnimatePresence>
    </>
  )
}
