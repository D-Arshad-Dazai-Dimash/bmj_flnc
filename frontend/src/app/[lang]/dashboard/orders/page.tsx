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
        className="w-full max-w-lg space-y-4 rounded-[18px] border border-border bg-[linear-gradient(180deg,rgba(6,9,30,0.96),rgba(7,9,45,0.92))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-h3 text-text-base">Подать предложение</h3>
          <button
            onClick={onClose}
            className="rounded-[8px] border border-transparent p-1.5 transition-colors hover:border-border hover:bg-bg-hover"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5 text-text-faint" />
          </button>
        </div>
        <p className="text-sm text-text-secondary truncate">{project.title}</p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-[510] tracking-caption text-text-secondary">
              Сопроводительное письмо
            </label>
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value.slice(0, 500))}
              placeholder="Расскажите почему вы подходите..."
              rows={4}
              className="w-full resize-none rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-base placeholder:text-text-faint transition-all duration-200 focus:border-border-focus focus:bg-bg-elevated focus:outline-none"
            />
            <span className="text-xs text-text-faint">{coverLetter.length}/500</span>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-[510] tracking-caption text-text-secondary">Ваша цена (₸)</label>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder={project.budget ? String(project.budget) : '—'}
              className="w-full rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-base placeholder:text-text-faint transition-all duration-200 focus:border-border-focus focus:bg-bg-elevated focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-[8px] border border-border bg-bg-card px-4 py-2 text-sm font-[510] tracking-caption text-text-secondary transition-colors hover:bg-bg-elevated"
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
            className="flex items-center gap-2 rounded-[8px] border border-[rgba(73,71,171,0.28)] bg-[linear-gradient(135deg,rgba(55,111,177,0.22),rgba(73,71,171,0.26),rgba(122,88,172,0.22))] px-4 py-2 text-sm font-[510] tracking-caption text-[#dcdcff] transition-all duration-200 hover:brightness-110 disabled:opacity-50"
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
    <div data-testid="order-card" className="rounded-[14px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)] transition-all duration-200 hover:border-border-bright hover:bg-bg-elevated hover:shadow-[0_20px_48px_rgba(5,8,48,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h3 className="truncate text-[17px] font-semibold tracking-h3 text-text-base">{p.title}</h3>
          {p.description && <p className="line-clamp-2 text-sm leading-6 text-text-secondary">{p.description}</p>}
        </div>
        <span className="chip shrink-0 border-[rgba(72,152,188,0.26)] bg-[rgba(72,152,188,0.08)] text-[#9fdcec]">
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
          <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[rgba(201,143,177,0.28)] bg-[rgba(201,143,177,0.08)] px-3 py-1.5 text-xs font-[510] tracking-caption text-[#efc7d9]">
            <Clock className="w-3 h-3" /> Предложение отправлено
          </span>
        ) : (
          <button
            data-testid="apply-btn"
            onClick={() => onPropose(p)}
            className="rounded-[8px] border border-[rgba(73,71,171,0.25)] bg-[linear-gradient(135deg,rgba(55,111,177,0.18),rgba(73,71,171,0.22),rgba(122,88,172,0.18))] px-3 py-1.5 text-xs font-[510] tracking-caption text-[#dcdcff] transition-all duration-200 hover:brightness-110"
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
        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(72,152,188,0.18)] bg-[linear-gradient(180deg,rgba(72,152,188,0.16),rgba(73,71,171,0.08))]">
          <ClipboardList className="w-5 h-5 text-[#8fd7ed]" />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">Лента заказов</h1>
          <p className="text-[15px] text-text-secondary">Актуальные открытые проекты от заказчиков</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : errMsg ? (
        <div className="rounded-[14px] border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-300">
          {errMsg}
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-bg-card p-12 text-center shadow-[0_1px_0_rgba(255,255,255,0.03)] flex flex-col items-center gap-3">
          <ClipboardList className="w-10 h-10 text-text-faint" />
          <p className="text-text-secondary">Открытых заказов пока нет</p>
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
