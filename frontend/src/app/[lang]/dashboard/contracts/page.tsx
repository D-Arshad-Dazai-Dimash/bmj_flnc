'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Shield, FileText, ArrowRight } from 'lucide-react'
import { api, ApiError, type ContractSummaryDto, type ContractStatusName } from '@/lib/api'

const STATUS_BADGE: Record<ContractStatusName, { label: string; className: string }> = {
  Draft:       { label: 'Черновик',     className: 'bg-amber-500/10 text-amber-400'   },
  Signed:      { label: 'Подписан',     className: 'bg-blue-500/10 text-blue-400'     },
  Funded:      { label: 'Оплачен',      className: 'bg-emerald-500/10 text-emerald-400' },
  InProgress:  { label: 'В работе',     className: 'bg-violet-500/10 text-violet-400' },
  Released:    { label: 'Завершён',     className: 'bg-emerald-500/10 text-emerald-400' },
  Disputed:    { label: 'Спор',         className: 'bg-red-500/10 text-red-400'       },
  Cancelled:   { label: 'Отменён',      className: 'bg-zinc-500/10 text-zinc-400'     },
}

export default function ContractsPage() {
  const params = useParams<{ lang?: string }>()
  const lang = params?.lang || 'ru'
  const [items, setItems] = useState<ContractSummaryDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.contracts.list()
      .then(setItems)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Не удалось загрузить контракты'))
  }, [])

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-400">
        {error}
      </div>
    )
  }

  if (items === null) {
    return <div className="rounded-xl border border-border bg-bg-card p-8 text-sm text-text-muted">Загрузка…</div>
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-10 flex flex-col items-center justify-center gap-3 text-center">
        <Shield className="w-10 h-10 text-text-faint" />
        <p className="text-text-base font-medium">Контрактов пока нет</p>
        <p className="text-sm text-text-muted max-w-md">
          Контракт создаётся со страницы проекта, после того как вы примете заявку исполнителя.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold text-text-base flex items-center gap-2">
        <FileText className="w-5 h-5 text-text-muted" />
        Мои контракты
      </h1>
      <ul className="divide-y divide-border rounded-xl border border-border bg-bg-card">
        {items.map(c => {
          const badge = STATUS_BADGE[c.status]
          return (
            <li key={c.id}>
              <Link
                href={`/${lang}/dashboard/contracts/${c.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-bg-hover transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-base truncate">{c.projectTitle}</p>
                  <p className="text-xs text-text-muted truncate">
                    {c.clientProfileName} → {c.executorProfileName}
                  </p>
                </div>
                <div className="text-sm tabular-nums text-text-base">
                  {c.amount.toLocaleString('ru-KZ')} {c.currency}
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded ${badge.className}`}>
                  {badge.label}
                </span>
                <ArrowRight className="w-4 h-4 text-text-faint" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
