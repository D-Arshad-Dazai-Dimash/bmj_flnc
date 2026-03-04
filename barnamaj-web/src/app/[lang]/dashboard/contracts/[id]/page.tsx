'use client'

import { motion } from 'framer-motion'
import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import Link from '@/components/ui/LocaleLink'
import ChatBox from '@/components/dashboard/ChatBox'
import { ArrowLeft, Banknote, Calendar, CheckCircle2, ExternalLink, Shield, Upload, X } from 'lucide-react'
import type { ContractWithDetails, ContractStatus, EscrowStatus } from '@/lib/database.types'

// ── Status badges ─────────────────────────────────────────────────────────────
const CONTRACT_STATUS: Record<ContractStatus, { label: string; cls: string }> = {
  active:    { label: 'Активен',   cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  completed: { label: 'Завершён',  cls: 'border-border text-text-faint' },
  disputed:  { label: 'Спор',      cls: 'border-red-500/40 text-red-400 bg-red-500/10' },
  cancelled: { label: 'Отменён',   cls: 'border-border text-text-faint' },
}
const ESCROW_STATUS: Record<EscrowStatus, { label: string; cls: string }> = {
  frozen:   { label: '❄️ Заморожено', cls: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
  released: { label: '✅ Выплачено',  cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  refunded: { label: '↩️ Возврат',   cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
}

// ── Submit work modal ─────────────────────────────────────────────────────────
function SubmitWorkModal({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void
  onSubmit: (url: string, desc: string) => void
  submitting: boolean
}) {
  const [url,  setUrl]  = useState('')
  const [desc, setDesc] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        className="w-full max-w-md rounded-2xl border border-border bg-bg-card p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-base">Сдать работу</h3>
          <button onClick={onClose} className="p-1 text-text-faint hover:text-text-base transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Ссылка на результат *</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-bg-surface text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">Комментарий (необязательно)</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-border bg-bg-surface text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 resize-none"
              placeholder="Что сделано, как запустить..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-bg-hover transition-colors">
            Отмена
          </button>
          <button
            disabled={!url.trim() || submitting}
            onClick={() => onSubmit(url.trim(), desc.trim())}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Upload className="w-4 h-4" />
            }
            Сдать
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>
}) {
  const { id } = use(params)
  const { user } = useAuth()
  const router   = useLocaleRouter()
  const supabase = useMemo(() => createClient(), [])

  const [contract,    setContract]    = useState<ContractWithDetails | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [showSubmit,  setShowSubmit]  = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [releasing,   setReleasing]   = useState(false)

  // Fetch contract
  useEffect(() => {
    if (!id) return
    async function fetchContract() {
      try {
        const { data } = await supabase
          .from('contracts')
          .select(`
            *,
            project:projects(id, title, budget),
            client_profile:profiles!contracts_client_id_fkey(id, full_name, avatar_url),
            freelancer_profile:profiles!contracts_freelancer_id_fkey(id, full_name, avatar_url)
          `)
          .eq('id', id)
          .single()
        setContract(data as unknown as ContractWithDetails)
      } finally {
        setLoading(false)
      }
    }
    fetchContract()
  }, [id, supabase])

  const isClient     = user?.accountType === 'Client'
  const isFreelancer = user?.accountType === 'Developer'

  const handleSubmitWork = useCallback(async (url: string, desc: string) => {
    if (!contract) return
    setSubmitting(true)
    try {
      await supabase.rpc('submit_work', {
        p_contract_id: contract.id,
        p_url:         url,
        p_description: desc || undefined,
      })
      setContract(prev => prev ? {
        ...prev,
        work_submission_url: url,
        work_description: desc || null,
        submitted_at: new Date().toISOString(),
      } : prev)
      setShowSubmit(false)
    } finally {
      setSubmitting(false)
    }
  }, [contract, supabase])

  const handleRelease = useCallback(async () => {
    if (!contract) return
    setReleasing(true)
    try {
      await supabase.rpc('release_escrow_payout', { p_contract_id: contract.id })
      setContract(prev => prev ? {
        ...prev,
        escrow_status: 'released',
        status: 'completed',
        released_at: new Date().toISOString(),
      } : prev)
    } finally {
      setReleasing(false)
    }
  }, [contract, supabase])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center text-sm text-red-400">
        Контракт не найден или у вас нет доступа
      </div>
    )
  }

  const cs = CONTRACT_STATUS[contract.status] ?? CONTRACT_STATUS.active
  const es = ESCROW_STATUS[contract.escrow_status]  ?? ESCROW_STATUS.frozen

  const canSubmit  = isFreelancer && contract.status === 'active' && !contract.submitted_at
  const canRelease = isClient    && contract.status === 'active' && !!contract.submitted_at

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Back */}
      <Link href="/dashboard/contracts" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-base transition-colors">
        <ArrowLeft className="w-4 h-4" /> Все контракты
      </Link>

      {/* Contract header */}
      <div className="rounded-2xl border border-border bg-bg-card p-6 space-y-5">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="text-xs text-text-faint font-mono">КОНТРАКТ #{contract.id.slice(0, 8).toUpperCase()}</p>
            <h1 className="text-xl font-bold text-text-base">
              {contract.project?.title ?? 'Проект'}
            </h1>
            <p className="text-sm text-text-muted">
              {isClient ? 'Исполнитель: ' : 'Заказчик: '}
              <span className="text-text-base">
                {isClient
                  ? contract.freelancer_profile?.full_name
                  : contract.client_profile?.full_name
                }
              </span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${cs.cls}`}>{cs.label}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${es.cls}`}>{es.label}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-bg-surface p-4">
            <div className="flex items-center gap-1.5 text-xs text-text-faint mb-1">
              <Banknote className="w-3.5 h-3.5" /> Сумма
            </div>
            <p className="text-lg font-bold text-text-base">
              {contract.amount.toLocaleString('ru-RU')} ₸
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-surface p-4">
            <div className="flex items-center gap-1.5 text-xs text-text-faint mb-1">
              <Shield className="w-3.5 h-3.5" /> Эскроу
            </div>
            <p className="text-sm font-medium text-text-base">{es.label}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-surface p-4">
            <div className="flex items-center gap-1.5 text-xs text-text-faint mb-1">
              <Calendar className="w-3.5 h-3.5" /> Создан
            </div>
            <p className="text-sm text-text-base">
              {new Date(contract.created_at).toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>

        {/* Work submission info */}
        {contract.submitted_at && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-1.5">
            <p className="text-xs font-medium text-cyan-400">Работа сдана {new Date(contract.submitted_at).toLocaleDateString('ru-RU')}</p>
            {contract.work_submission_url && (
              <a href={contract.work_submission_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-accent-light hover:text-accent-bright transition-colors">
                <ExternalLink className="w-3 h-3" /> Открыть результат
              </a>
            )}
            {contract.work_description && (
              <p className="text-xs text-text-muted">{contract.work_description}</p>
            )}
          </div>
        )}

        {/* Actions */}
        {(canSubmit || canRelease) && (
          <div className="flex gap-3 pt-1">
            {canSubmit && (
              <button
                onClick={() => setShowSubmit(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
              >
                <Upload className="w-4 h-4" /> Сдать работу
              </button>
            )}
            {canRelease && (
              <button
                onClick={handleRelease}
                disabled={releasing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 transition-colors"
              >
                {releasing
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />
                }
                Принять и выплатить
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chat */}
      <ChatBox contractId={id} />

      {/* Submit work modal */}
      {showSubmit && (
        <SubmitWorkModal
          onClose={() => setShowSubmit(false)}
          onSubmit={handleSubmitWork}
          submitting={submitting}
        />
      )}
    </motion.div>
  )
}
