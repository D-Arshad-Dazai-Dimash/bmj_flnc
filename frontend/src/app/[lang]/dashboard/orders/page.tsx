'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Calendar, Banknote, X, Send, Clock } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api, ApiError, type ProjectSummaryDto } from '@/lib/api'

// ── Proposal modal ──────────────────────────────────────────────────────────
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-base">Подать предложение</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-hover transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5 text-text-faint" />
          </button>
        </div>
        <p className="text-sm text-text-muted truncate">{project.title}</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-faint block mb-1">
              Сопроводительное письмо
            </label>
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value.slice(0, 500))}
              placeholder="Расскажите почему вы подходите..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-bg-base border border-border text-sm text-text-base placeholder:text-text-faint resize-none focus:outline-none focus:border-accent transition-colors"
            />
            <span className="text-xs text-text-faint">{coverLetter.length}/500</span>
          </div>
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
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border text-text-muted hover:bg-bg-hover transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={() =>
              onSubmit({
                coverLetter: coverLetter.trim(),
                proposedBudget: budget ? Number(budget) : null,
              })
            }
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
  onPropose,
  hasProposal,
}: {
  project: ProjectSummaryDto
  onPropose: (p: ProjectSummaryDto) => void
  hasProposal: boolean
}) {
  return (
    <div data-testid="order-card" className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h3 className="font-semibold text-text-base truncate">{p.title}</h3>
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
        {p.clientProfileName && (
          <span className="text-text-faint">
            от <span className="text-text-muted">{p.clientProfileName}</span>
          </span>
        )}
        {p.applicationCount > 0 && (
          <span className="text-text-faint">{p.applicationCount} заявок</span>
        )}
      </div>
      <div className="pt-1">
        {hasProposal ? (
          <span className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/40 text-amber-400 bg-amber-500/10 inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Предложение отправлено
          </span>
        ) : (
          <button
            data-testid="apply-btn"
            onClick={() => onPropose(p)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-accent/40 text-accent-light bg-accent/10 hover:bg-accent/20 transition-colors"
          >
            Подать предложение
          </button>
        )}
      </div>
    </div>
  )
})

export default function OrdersPage() {
  const { user } = useAuth()

  const [projects, setProjects] = useState<ProjectSummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const [proposalTarget, setProposalTarget] = useState<ProjectSummaryDto | null>(null)
  const [sending, setSending] = useState(false)
  const [proposalIds, setProposalIds] = useState<Set<string>>(new Set())

  // ── Load feed ────────────────────────────────────────────────
  useEffect(() => {
    let aborted = false
    api.projects
      .feed(1, 50)
      .then(data => {
        if (!aborted) setProjects(data)
      })
      .catch((e: unknown) => {
        if (!aborted) setErrMsg(e instanceof ApiError ? e.message : 'Ошибка загрузки')
      })
      .finally(() => {
        if (!aborted) setLoading(false)
      })
    return () => {
      aborted = true
    }
  }, [])

  // ── Submit proposal ─────────────────────────────────────────
  const handleProposalSubmit = useCallback(
    async (data: { coverLetter: string; proposedBudget: number | null }) => {
      if (!user?.profileId || !proposalTarget) {
        setErrMsg('Профиль не найден. Перезайдите в аккаунт.')
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
        setErrMsg(e instanceof ApiError ? e.message : 'Не удалось отправить заявку')
      } finally {
        setSending(false)
      }
    },
    [user?.profileId, proposalTarget],
  )

  const visibleProjects = useMemo(
    () => projects.filter(p => p.status === 'Open' || p.status === 'open'),
    [projects],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-cyan-500/15">
          <ClipboardList className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Лента заказов</h1>
          <p className="text-sm text-text-muted">Актуальные открытые проекты от заказчиков</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : errMsg ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-400">
          {errMsg}
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-12 flex flex-col items-center gap-3 text-center">
          <ClipboardList className="w-10 h-10 text-text-faint" />
          <p className="text-text-muted">Открытых заказов пока нет</p>
          <p className="text-xs text-text-faint max-w-xs">
            Возвращайтесь позже — здесь появятся актуальные проекты от клиентов.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleProjects.map(p => (
            <OrderCard
              key={p.id}
              project={p}
              onPropose={setProposalTarget}
              hasProposal={proposalIds.has(p.id)}
            />
          ))}
        </div>
      )}

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
    </motion.div>
  )
}
