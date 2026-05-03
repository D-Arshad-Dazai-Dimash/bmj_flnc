'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Shield, CheckCircle2, Wallet, FileText } from 'lucide-react'
import { api, ApiError, type ContractDetailDto } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { KycGate } from '@/components/KycGate'
import { useAuth } from '@/context/AuthContext'
import ChatBox from '@/components/dashboard/ChatBox'

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { user } = useAuth()
  const [contract, setContract] = useState<ContractDetailDto | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [busy, setBusy]         = useState(false)
  const [gate, setGate]         = useState<{ required: 'Lite' | 'Full'; current?: string } | null>(null)

  const reload = async () => {
    if (!id) return
    try { setContract(await api.contracts.get(id)) }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Ошибка') }
  }

  useEffect(() => { reload() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [id])

  const myProfileId = user?.profileId ?? ''
  const isClient    = contract?.clientProfileId   === myProfileId
  const isExecutor  = contract?.executorProfileId === myProfileId
  const mySignedAt  = isClient ? contract?.clientSignedAt : contract?.executorSignedAt

  const handle = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null)
    try { await fn(); await reload() }
    catch (err) {
      if (err instanceof ApiError && err.statusCode === 403) {
        const body = err.body as { code?: string; required?: string; current?: string } | undefined
        if (body?.code === 'kyc_required') {
          setGate({ required: (body.required as 'Lite' | 'Full') ?? 'Lite', current: body.current })
          return
        }
      }
      setError(err instanceof ApiError ? err.message : 'Ошибка')
    } finally { setBusy(false) }
  }

  if (error && !contract) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-400">{error}</div>
  }
  if (!contract) {
    return <div className="rounded-xl border border-border bg-bg-card p-8 text-sm text-text-muted">Загрузка…</div>
  }

  return (
    <div className="space-y-4">
      {gate && <KycGate required={gate.required} current={gate.current} onClose={() => setGate(null)} />}

      <header className="rounded-xl border border-border bg-bg-card p-5 space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-text-muted" />
          <h1 className="text-base font-semibold text-text-base">{contract.projectTitle}</h1>
          <span className="ml-auto text-[11px] px-2 py-0.5 rounded bg-bg-hover text-text-muted">
            {contract.status}
          </span>
        </div>
        <div className="text-sm text-text-muted">
          Сумма: <span className="text-text-base tabular-nums">
            {contract.amount.toLocaleString('ru-KZ')} {contract.currency}
          </span>
        </div>
        <div className="text-xs text-text-muted">
          Заказчик: {contract.clientProfileName} · Исполнитель: {contract.executorProfileName}
        </div>
      </header>

      {/* Шаги контракта */}
      <ol className="space-y-2">
        <Step
          done={!!contract.clientSignedAt && !!contract.executorSignedAt}
          icon={<CheckCircle2 className="w-4 h-4" />}
          title="Подписание сторонами"
          subtitle={
            <>
              Заказчик: {contract.clientSignedAt ? '✓' : '—'} ·
              Исполнитель: {contract.executorSignedAt ? '✓' : '—'}
            </>
          }
        >
          {(isClient || isExecutor) && !mySignedAt && contract.status === 'Draft' && (
            <Button size="sm" loading={busy} onClick={() => handle(() => api.contracts.sign(contract.id))}>
              Подписать
            </Button>
          )}
        </Step>

        <Step
          done={contract.status === 'Funded' || contract.status === 'Released' || contract.status === 'InProgress'}
          icon={<Wallet className="w-4 h-4" />}
          title="Эскроу пополнен"
          subtitle={contract.fundedAt ? new Date(contract.fundedAt).toLocaleString('ru-RU') : 'ожидание оплаты заказчиком'}
        >
          {isClient && contract.status === 'Signed' && (
            <Button size="sm" loading={busy} onClick={() => handle(() => api.payments.initiate(contract.id))}>
              Пополнить эскроу
            </Button>
          )}
        </Step>

        <Step
          done={contract.status === 'Released'}
          icon={<Shield className="w-4 h-4" />}
          title="Приёмка работы"
          subtitle={contract.releasedAt ? new Date(contract.releasedAt).toLocaleString('ru-RU') : 'после готовности результата'}
        >
          {isClient && (contract.status === 'Funded' || contract.status === 'InProgress') && (
            <Button size="sm" loading={busy} onClick={() => handle(() => api.contracts.release(contract.id))}>
              Подтвердить приёмку
            </Button>
          )}
        </Step>
      </ol>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">{error}</div>
      )}

      {(isClient || isExecutor) && contract.status !== 'Draft' && (
        <ChatBox contractId={contract.id} />
      )}
    </div>
  )
}

function Step({ done, icon, title, subtitle, children }:
  { done: boolean; icon: React.ReactNode; title: string; subtitle: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className={`rounded-xl border border-border bg-bg-card p-4 flex items-start gap-3
                    ${done ? 'opacity-100' : 'opacity-90'}`}>
      <span className={`mt-0.5 ${done ? 'text-emerald-400' : 'text-text-muted'}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-base">{title}</p>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>
      <div className="ml-2">{children}</div>
    </li>
  )
}
