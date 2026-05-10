'use client'

import { useEffect, useMemo, useState } from 'react'
import { Shield, Inbox, Wallet, ArrowRight } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import LocaleLink from '@/components/ui/LocaleLink'
import { listContractsFor, STATUS_LABELS, type Contract, type ContractStatus } from '@/lib/contractsStore'
import { formatTenge } from '@/lib/pricing'

type FilterRole = 'all' | 'as-client' | 'as-executor'

const STATUS_TONE: Record<ContractStatus, string> = {
  Draft:     'border-text-faint/30 bg-bg-elevated text-text-secondary',
  Active:    'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  Funded:    'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
  InReview:  'border-amber-400/30 bg-amber-400/10 text-amber-300',
  Released:  'border-violet-400/30 bg-violet-400/10 text-violet-300',
  Disputed:  'border-red-400/30 bg-red-400/10 text-red-300',
  Cancelled: 'border-text-faint/30 bg-bg-elevated text-text-faint',
}

export default function ContractsPage() {
  const { user } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [filter, setFilter] = useState<FilterRole>('all')

  // подгружаем + слушаем storage (мульти-таб)
  useEffect(() => {
    if (!user?.profileId) return
    const reload = () => setContracts(listContractsFor(user.profileId))
    reload()
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'bj.contracts.v1') reload()
    }
    window.addEventListener('storage', onStorage)
    const t = setInterval(reload, 4000)
    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(t)
    }
  }, [user?.profileId])

  const visible = useMemo(() => {
    if (!user?.profileId) return []
    if (filter === 'as-client') return contracts.filter(c => c.clientProfileId === user.profileId)
    if (filter === 'as-executor') return contracts.filter(c => c.executorProfileId === user.profileId)
    return contracts
  }, [contracts, filter, user?.profileId])

  return (
    <div className="space-y-6 max-w-5xl">
      {/* шапка */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(72,152,188,0.18)] bg-[linear-gradient(180deg,rgba(72,152,188,0.16),rgba(73,71,171,0.08))]">
            <Shield className="w-5 h-5 text-[#8fd7ed]" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">Контракты</h1>
            <p className="text-[14px] text-text-secondary">Условия сделки, этапы работ и история действий</p>
          </div>
        </div>

        <div className="hidden gap-1 rounded-lg border border-border bg-bg-card p-1 text-xs sm:flex">
          {[
            { id: 'all', label: 'Все' },
            { id: 'as-client', label: 'Я заказчик' },
            { id: 'as-executor', label: 'Я исполнитель' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id as FilterRole)}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                filter === opt.id
                  ? 'bg-bg-elevated text-text-base'
                  : 'text-text-secondary hover:text-text-base'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* список */}
      {!user?.profileId ? (
        <EmptyCard title="Войдите в аккаунт" hint="Контракты доступны только авторизованным пользователям." />
      ) : visible.length === 0 ? (
        <EmptyCard
          title="У вас пока нет контрактов"
          hint="Контракт создаётся из карточки заказа после согласования с исполнителем."
        />
      ) : (
        <div className="space-y-3">
          {visible.map(c => {
            const role: 'client' | 'executor' = c.clientProfileId === user.profileId ? 'client' : 'executor'
            const otherName = role === 'client' ? c.executorName : c.clientName
            const approved = c.milestones.filter(m => m.status === 'Approved').length
            const total = c.milestones.length
            return (
              <LocaleLink
                key={c.id}
                href={`/dashboard/contracts/${c.id}`}
                className="group block rounded-xl border border-border bg-bg-card p-4 transition-all hover:border-white/15 hover:bg-bg-hover"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${STATUS_TONE[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                      <span className="text-[11px] text-text-faint">
                        {role === 'client' ? 'вы заказчик' : 'вы исполнитель'}
                      </span>
                    </div>
                    <h3 className="mt-2 truncate text-[15px] font-medium text-text-base">{c.projectTitle}</h3>
                    <p className="mt-1 text-[12.5px] text-text-secondary">
                      Контрагент: <span className="text-text-base">{otherName}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5" />
                        {formatTenge(c.totalAmount)}
                      </span>
                      <span>·</span>
                      <span>Этапы: {approved}/{total}</span>
                      <span>·</span>
                      <span>Обновлён: {new Date(c.updatedAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-text-base" />
                </div>
              </LocaleLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyCard({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-bg-elevated">
        <Inbox className="h-5 w-5 text-text-faint" />
      </div>
      <p className="text-[15px] font-medium text-text-base">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-text-secondary">{hint}</p>
    </div>
  )
}
