'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Shield,
  CheckCircle2,
  XCircle,
  Send,
  AlertTriangle,
  Wallet,
  ListChecks,
  History as HistoryIcon,
  ArrowLeft,
} from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import LocaleLink from '@/components/ui/LocaleLink'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { formatTenge } from '@/lib/pricing'
import {
  api,
  ApiError,
  type ContractDetailDto,
  type ContractStatusStr,
  type MilestoneDto,
} from '@/lib/api'

const STATUS_LABELS: Record<ContractStatusStr, string> = {
  Draft: 'Черновик',
  Active: 'Активен',
  InReview: 'На проверке',
  Released: 'Завершён',
  Disputed: 'Спор',
  Cancelled: 'Отменён',
}

const STATUS_TONE: Record<ContractStatusStr, string> = {
  Draft:     'border-text-faint/30 bg-bg-elevated text-text-secondary',
  Active:    'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  InReview:  'border-amber-400/30 bg-amber-400/10 text-amber-300',
  Released:  'border-violet-400/30 bg-violet-400/10 text-violet-300',
  Disputed:  'border-red-400/30 bg-red-400/10 text-red-300',
  Cancelled: 'border-text-faint/30 bg-bg-elevated text-text-faint',
}

type MilestoneStatusStr = 'Pending' | 'Submitted' | 'Approved' | 'Rejected'

const MS_LABELS: Record<MilestoneStatusStr, string> = {
  Pending: 'Ожидает',
  Submitted: 'На проверке',
  Approved: 'Принят',
  Rejected: 'Отклонён',
}

const MS_TONE: Record<MilestoneStatusStr, string> = {
  Pending:   'border-text-faint/30 bg-bg-elevated text-text-secondary',
  Submitted: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  Approved:  'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  Rejected:  'border-red-400/30 bg-red-400/10 text-red-300',
}

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>
}) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useLocaleRouter()

  const [contract, setContract] = useState<ContractDetailDto | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      const c = await api.contracts.get(id)
      setContract(c)
      setLoadErr(null)
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 404) {
        setContract(null)
        setLoadErr('Контракт не найден.')
      } else {
        setLoadErr(e instanceof ApiError ? e.message : 'Не удалось загрузить контракт')
      }
    }
  }, [id])

  useEffect(() => {
    void reload()
    const t = setInterval(() => void reload(), 8000)
    return () => clearInterval(t)
  }, [reload])

  const role: 'client' | 'executor' | null = useMemo(() => {
    if (!contract || !user?.profileId) return null
    if (contract.clientProfileId === user.profileId) return 'client'
    if (contract.executorProfileId === user.profileId) return 'executor'
    return null
  }, [contract, user?.profileId])

  if (!contract) {
    return (
      <div className="space-y-4 max-w-3xl">
        <button
          onClick={() => router.push('/dashboard/contracts')}
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-base"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку
        </button>
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center text-text-muted">
          {loadErr ?? 'Загрузка…'}
        </div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="space-y-4 max-w-3xl">
        <button
          onClick={() => router.push('/dashboard/contracts')}
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-base"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку
        </button>
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-6 text-sm text-red-300">
          У вас нет доступа к этому контракту.
        </div>
      </div>
    )
  }

  const otherName = role === 'client' ? contract.executorProfileName : contract.clientProfileName
  const otherId   = role === 'client' ? contract.executorProfileId : contract.clientProfileId

  const approvedCount = contract.milestonesApproved
  const totalCount    = contract.milestonesTotal
  const progressPct   = totalCount === 0 ? 0 : Math.round((approvedCount / totalCount) * 100)

  const safeRun = async (fn: () => Promise<unknown>) => {
    setActionErr(null)
    setBusy(true)
    try { await fn(); await reload() } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : (e instanceof Error ? e.message : 'Не удалось выполнить действие'))
    } finally { setBusy(false) }
  }

  const onCancel = () => {
    if (!confirm('Отменить контракт?')) return
    void safeRun(() => api.contracts.transition(contract.id, 'Cancelled'))
  }
  const onDispute = () => {
    if (!confirm('Открыть спор по контракту?')) return
    void safeRun(() => api.contracts.transition(contract.id, 'Disputed'))
  }
  const onResolveDispute = () => {
    void safeRun(() => api.contracts.transition(contract.id, 'Active'))
  }

  const onSubmit = (m: MilestoneDto) =>
    void safeRun(() => api.contracts.submitMilestone(contract.id, m.id))
  const onApprove = (m: MilestoneDto) =>
    void safeRun(() => api.contracts.approveMilestone(contract.id, m.id))
  const onReject = (m: MilestoneDto) =>
    void safeRun(() => api.contracts.rejectMilestone(contract.id, m.id))

  const isFinal = contract.status === 'Released' || contract.status === 'Cancelled'

  return (
    <div className="space-y-6 max-w-4xl">
      <button
        onClick={() => router.push('/dashboard/contracts')}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-base"
      >
        <ArrowLeft className="h-4 w-4" />
        К списку контрактов
      </button>

      {/* Шапка */}
      <div className="rounded-xl border border-border bg-bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#8fd7ed]" />
              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${STATUS_TONE[contract.status]}`}>
                {STATUS_LABELS[contract.status]}
              </span>
              <span className="text-[11px] text-text-faint">
                {role === 'client' ? 'вы заказчик' : 'вы исполнитель'}
              </span>
            </div>
            <h1 className="mt-2 text-[22px] font-semibold tracking-h2 text-text-base">
              {contract.projectTitle}
            </h1>
            <p className="mt-1 text-[13px] text-text-secondary">
              Контрагент:{' '}
              <LocaleLink
                href={`/profiles/${otherId}`}
                className="text-text-base underline-offset-4 hover:underline"
              >
                {otherName}
              </LocaleLink>
            </p>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary">
              <Wallet className="h-4 w-4" />
              Сумма контракта
            </div>
            <div className="text-[20px] font-semibold tabular-nums text-text-base">
              {formatTenge(contract.totalAmount)}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[12px] text-text-muted">
            <span>Принято этапов: {approvedCount}/{totalCount}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-[#7170ff] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {!isFinal && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={onCancel}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-xs text-text-secondary hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Отменить
            </button>
            {contract.status === 'Disputed' ? (
              <button
                onClick={onResolveDispute}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-400/15 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Снять спор
              </button>
            ) : (
              <button
                onClick={onDispute}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300 hover:bg-amber-400/15 disabled:opacity-50"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Открыть спор
              </button>
            )}
          </div>
        )}

        {actionErr && (
          <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/[0.06] p-2 text-[12px] text-red-300">
            {actionErr}
          </div>
        )}
      </div>

      {/* Этапы */}
      <section className="rounded-xl border border-border bg-bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-text-secondary" />
          <h2 className="text-[15px] font-medium text-text-base">Этапы</h2>
        </div>

        <ol className="space-y-3">
          {contract.milestones.map((m, idx) => {
            const status = m.status as MilestoneStatusStr
            const prev = idx > 0 ? contract.milestones[idx - 1] : null
            const blockedBecausePrev = prev && prev.status !== 'Approved'

            const canSubmit = role === 'executor' &&
              (status === 'Pending' || status === 'Rejected') &&
              !blockedBecausePrev &&
              !isFinal
            const canApprove = role === 'client' && status === 'Submitted' && !isFinal
            const canReject  = role === 'client' && status === 'Submitted' && !isFinal

            return (
              <li
                key={m.id}
                className="rounded-lg border border-border bg-bg-base p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-text-faint">#{idx + 1}</span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${MS_TONE[status]}`}>
                        {MS_LABELS[status]}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-[14px] font-medium text-text-base">{m.title}</h3>
                    {m.notes && (
                      <p className="mt-1 text-[12.5px] text-text-secondary whitespace-pre-wrap">{m.notes}</p>
                    )}
                    {m.dueDate && (
                      <p className="mt-1 text-[11.5px] text-text-faint">
                        Срок: {new Date(m.dueDate).toLocaleDateString('ru-RU')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-semibold tabular-nums text-text-base">
                      {formatTenge(m.amount)}
                    </div>
                    <div className="mt-2 flex flex-col items-end gap-1">
                      {canSubmit && (
                        <button
                          onClick={() => onSubmit(m)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-md bg-[#7170ff] px-2.5 py-1.5 text-[11.5px] font-medium text-white hover:bg-[#5f5eff] disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" />
                          Сдать на проверку
                        </button>
                      )}
                      {canApprove && (
                        <button
                          onClick={() => onApprove(m)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/90 px-2.5 py-1.5 text-[11.5px] font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Принять
                        </button>
                      )}
                      {canReject && (
                        <button
                          onClick={() => onReject(m)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 bg-red-400/10 px-2.5 py-1.5 text-[11.5px] text-red-300 hover:bg-red-400/15 disabled:opacity-50"
                        >
                          <XCircle className="h-3 w-3" />
                          Отклонить
                        </button>
                      )}
                      {blockedBecausePrev && role === 'executor' && (status === 'Pending' || status === 'Rejected') && (
                        <span className="text-[11px] text-text-faint">Сначала завершите предыдущий этап</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* История */}
      <section className="rounded-xl border border-border bg-bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-text-secondary" />
          <h2 className="text-[15px] font-medium text-text-base">История</h2>
        </div>
        <ul className="space-y-2">
          {[...contract.events].reverse().map(ev => (
            <li key={ev.id} className="flex items-start gap-3 rounded-lg border border-border bg-bg-base p-2.5 text-[12.5px]">
              <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7170ff]" />
              <div className="min-w-0 flex-1">
                <div className="text-text-base">
                  <span className="font-medium">{ev.actorProfileName}</span>
                  <span className="text-text-muted"> · {ev.action}</span>
                  {ev.details && <span className="text-text-secondary"> — {ev.details}</span>}
                </div>
                <div className="text-[11px] text-text-faint">
                  {new Date(ev.createdAt).toLocaleString('ru-RU')}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
