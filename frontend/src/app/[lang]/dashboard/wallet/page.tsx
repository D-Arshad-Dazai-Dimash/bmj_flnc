'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet as WalletIcon, ShieldCheck, ArrowDownToLine, ArrowUpFromLine,
  Lock, CheckCircle2, Clock, AlertTriangle, Plus,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  api, type WalletDto, type ProjectBalanceDto,
  type TransactionDto, type ContractStatusStr,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import LocaleLink from '@/components/ui/LocaleLink'

const fmtKzt = (n: number) =>
  new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 })
    .format(n ?? 0)

const STATUS_LABEL: Record<ContractStatusStr, { label: string; tone: string }> = {
  Draft:     { label: 'Черновик',       tone: 'text-text-muted' },
  Active:    { label: 'Активный',        tone: 'text-emerald-300' },
  InReview:  { label: 'На проверке',     tone: 'text-yellow-300' },
  Released:  { label: 'Закрыт',          tone: 'text-cyan-300' },
  Disputed:  { label: 'Спор',            tone: 'text-orange-300' },
  Cancelled: { label: 'Отменён',         tone: 'text-red-300' },
}

const TX_LABEL: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  Deposit:          { label: 'Пополнение',                 icon: ArrowDownToLine, tone: 'text-emerald-300' },
  Withdrawal:       { label: 'Вывод',                      icon: ArrowUpFromLine, tone: 'text-orange-300' },
  EscrowHold:       { label: 'Заморозка в эскроу',         icon: Lock,            tone: 'text-yellow-300' },
  EscrowRelease:    { label: 'Выплата по этапу',           icon: CheckCircle2,    tone: 'text-cyan-300' },
  Refund:           { label: 'Возврат',                    icon: ArrowDownToLine, tone: 'text-emerald-300' },
  Commission:       { label: 'Комиссия платформы',         icon: ShieldCheck,     tone: 'text-text-muted' },
  ManualAdjustment: { label: 'Ручная корректировка',       icon: AlertTriangle,   tone: 'text-violet-300' },
}

export default function WalletPage() {
  const { user } = useAuth()
  const [wallet, setWallet]       = useState<WalletDto | null>(null)
  const [projects, setProjects]   = useState<ProjectBalanceDto[]>([])
  const [txns, setTxns]           = useState<TransactionDto[]>([])
  const [loading, setLoading]     = useState(true)
  const [err, setErr]             = useState<string | null>(null)

  // Demo top-up form
  const [topupAmount, setTopupAmount] = useState<string>('100000')
  const [topupBusy, setTopupBusy]     = useState(false)

  const loadAll = async () => {
    setErr(null)
    try {
      const [w, p, h] = await Promise.all([
        api.wallet.me(),
        api.wallet.projects(),
        api.wallet.history(1, 25),
      ])
      setWallet(w)
      setProjects(p)
      setTxns(h.transactions)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось загрузить кошелёк')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const doTopUp = async () => {
    const amount = Math.floor(Number(topupAmount.replace(/\s/g, '')) || 0)
    if (amount <= 0) { setErr('Сумма пополнения должна быть положительной'); return }
    setTopupBusy(true)
    try {
      const w = await api.wallet.demoTopUp(amount)
      setWallet(w)
      // обновим историю + балансы
      const h = await api.wallet.history(1, 25)
      setTxns(h.transactions)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка пополнения')
    } finally {
      setTopupBusy(false)
    }
  }

  if (loading) {
    return <div className="text-text-muted">Загрузка кошелька…</div>
  }
  if (err && !wallet) {
    return <div className="text-red-300">{err}</div>
  }

  const isClient = user?.accountType === 'Client'

  // Агрегаты по проектам, видимые тек. пользователю
  const asClientFrozen = projects
    .filter(p => p.role === 'Client' && (p.status === 'Active' || p.status === 'InReview' || p.status === 'Disputed'))
    .reduce((s, p) => s + (p.escrowFunded - p.escrowReleased), 0)
  const asExecutorPending = projects
    .filter(p => p.role === 'Executor' && (p.status === 'Active' || p.status === 'InReview' || p.status === 'Disputed'))
    .reduce((s, p) => s + (p.escrowFunded - p.escrowReleased), 0)

  return (
    <motion.div
      className="space-y-6 max-w-6xl"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(73,71,171,0.18)] bg-[linear-gradient(180deg,rgba(99,138,212,0.12),rgba(73,71,171,0.08))]">
          <WalletIcon className="w-5 h-5 text-[#c7ccff]" />
        </div>
        <div>
          <div className="chip chip-accent mb-2">Wallet & Escrow</div>
          <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">Кошелёк</h1>
          <p className="text-[15px] text-text-secondary">
            Безопасный эскроу: деньги клиента «лежат у платформы» и переводятся исполнителю только после одобрения этапа.
          </p>
        </div>
      </div>

      {err && (
        <div className="rounded-[10px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</div>
      )}

      {/* ── KPI: 3 баланса ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <BalanceCard
          tone="violet"
          icon={WalletIcon}
          label="Доступный баланс"
          value={fmtKzt(wallet?.availableBalance ?? 0)}
          hint="Свободные средства, доступные для оплаты контрактов или вывода."
        />
        <BalanceCard
          tone="amber"
          icon={Lock}
          label="Заморожено в эскроу"
          value={fmtKzt(wallet?.frozenBalance ?? 0)}
          hint={isClient
            ? 'Удерживается платформой по активным контрактам — выплачивается исполнителю по мере приёмки этапов.'
            : 'Резервы по контрактам, в которых вы исполнитель — поступит после одобрения этапа.'}
        />
        <BalanceCard
          tone="cyan"
          icon={ArrowUpFromLine}
          label="К выводу"
          value={fmtKzt(wallet?.pendingWithdrawal ?? 0)}
          hint="В обработке у банка. Появится сюда после интеграции платёжного провайдера."
        />
      </div>

      {/* ── Контекстная подсказка про «третий баланс»: проектный ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ContextCard
          label="Заморожено по моим заказам"
          value={fmtKzt(asClientFrozen)}
          desc="Сумма, которую вы как заказчик уже задепонировали по активным контрактам."
        />
        <ContextCard
          label="Жду по проектам исполнителем"
          value={fmtKzt(asExecutorPending)}
          desc="Сколько ещё ожидаемо поступит после приёмки оставшихся этапов."
        />
      </div>

      {/* ── Demo top-up (MVP) ── */}
      <div className="rounded-[16px] border border-border bg-bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Plus className="w-4 h-4 text-text-secondary" />
          <h2 className="text-[13px] font-[510] tracking-caption text-text-base">Пополнение баланса (demo)</h2>
        </div>
        <p className="text-xs text-text-muted leading-6">
          MVP: до интеграции платёжного провайдера пополнение работает напрямую. В проде здесь будет редирект на банковскую страницу 3DS.
        </p>
        <div className="flex items-end gap-3 max-w-md">
          <Input
            label="Сумма (₸)"
            type="number"
            min="1"
            value={topupAmount}
            onChange={e => setTopupAmount(e.target.value)}
            placeholder="100000"
          />
          <Button onClick={doTopUp} loading={topupBusy} className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Пополнить
          </Button>
        </div>
      </div>

      {/* ── Project balances ── */}
      <div className="rounded-[16px] border border-border bg-bg-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-text-secondary" />
            <h2 className="text-[13px] font-[510] tracking-caption text-text-base">Балансы по проектам (эскроу)</h2>
          </div>
          <span className="text-[11px] text-text-faint">{projects.length} контрактов</span>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-text-muted">Здесь появятся ваши контракты. Создайте проект и контракт — и сумма автоматически отразится в эскроу.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-bg-panel text-left text-[11px] uppercase tracking-[0.08em] text-text-faint">
                <tr>
                  <th className="px-3 py-2.5">Проект</th>
                  <th className="px-3 py-2.5">Роль</th>
                  <th className="px-3 py-2.5">Контрагент</th>
                  <th className="px-3 py-2.5 text-right">Всего</th>
                  <th className="px-3 py-2.5 text-right">В эскроу</th>
                  <th className="px-3 py-2.5 text-right">Выплачено</th>
                  <th className="px-3 py-2.5">Статус</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => {
                  const meta = STATUS_LABEL[p.status]
                  return (
                    <tr key={p.contractId} className="border-t border-border hover:bg-bg-hover transition-colors">
                      <td className="px-3 py-2.5">
                        <LocaleLink href={`/dashboard/contracts/${p.contractId}`} className="text-text-base hover:text-[#a8a6ff] underline-offset-4 hover:underline">
                          {p.projectTitle}
                        </LocaleLink>
                      </td>
                      <td className="px-3 py-2.5 text-text-muted">{p.role === 'Client' ? 'Заказчик' : 'Исполнитель'}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{p.counterpartyName}</td>
                      <td className="px-3 py-2.5 text-right text-text-base">{fmtKzt(p.totalAmount)}</td>
                      <td className="px-3 py-2.5 text-right text-yellow-300">{fmtKzt(p.escrowFunded - p.escrowReleased)}</td>
                      <td className="px-3 py-2.5 text-right text-cyan-300">{fmtKzt(p.escrowReleased)}</td>
                      <td className={cn('px-3 py-2.5 text-xs font-[510]', meta.tone)}>{meta.label}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── История транзакций ── */}
      <div className="rounded-[16px] border border-border bg-bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-text-secondary" />
          <h2 className="text-[13px] font-[510] tracking-caption text-text-base">История транзакций</h2>
        </div>
        {txns.length === 0 ? (
          <p className="text-sm text-text-muted">Пока пусто. Все операции будут отображаться здесь.</p>
        ) : (
          <div className="space-y-1.5">
            {txns.map(t => {
              const meta = TX_LABEL[t.type] ?? { label: t.type, icon: WalletIcon, tone: 'text-text-muted' }
              const Icon = meta.icon
              const positive = t.amount >= 0
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-[10px] border border-border bg-bg-panel px-3 py-2.5">
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-[8px] bg-bg-hover', meta.tone)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-base">{meta.label}</p>
                    {t.description && <p className="truncate text-xs text-text-muted">{t.description}</p>}
                  </div>
                  <div className="text-right">
                    <p className={cn('text-sm font-[510]', positive ? 'text-emerald-300' : 'text-orange-300')}>
                      {positive ? '+' : ''}{fmtKzt(t.amount)}
                    </p>
                    <p className="text-[10px] text-text-faint">{new Date(t.createdAt).toLocaleString('ru-KZ')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Безопасность ── */}
      <div className="rounded-[12px] border border-border bg-bg-card p-4 text-xs text-text-secondary leading-6">
        <p className="font-[510] text-text-base text-[13px] mb-1 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#a8a6ff]" /> Как работает эскроу
        </p>
        Заказчик пополняет кошелёк → создаёт контракт → сумма автоматически замораживается у платформы.
        После одобрения каждого этапа соответствующая сумма переводится исполнителю.
        При отмене контракта остаток возвращается заказчику. Любой обмен контактами в чате автоматически
        фильтруется, чтобы стороны не уходили мимо платформы.
      </div>
    </motion.div>
  )
}

function BalanceCard({
  tone, icon: Icon, label, value, hint,
}: {
  tone: 'violet' | 'amber' | 'cyan'
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
}) {
  const colorMap = {
    violet: { ring: 'rgba(113,112,255,0.25)',  bg: 'rgba(113,112,255,0.10)', icon: 'text-[#a8a6ff]', accent: 'text-[#c7ccff]' },
    amber:  { ring: 'rgba(245,158,11,0.25)',   bg: 'rgba(245,158,11,0.08)',  icon: 'text-yellow-300', accent: 'text-yellow-200' },
    cyan:   { ring: 'rgba(34,211,238,0.25)',   bg: 'rgba(34,211,238,0.08)',  icon: 'text-cyan-300',  accent: 'text-cyan-200' },
  }[tone]
  return (
    <div
      className="rounded-[16px] border p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)]"
      style={{ borderColor: colorMap.ring, background: `linear-gradient(180deg, ${colorMap.bg}, rgba(255,255,255,0.02))` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('w-4 h-4', colorMap.icon)} />
        <span className="text-[12px] font-[510] tracking-caption text-text-secondary">{label}</span>
      </div>
      <p className={cn('text-[24px] font-semibold tracking-tight mb-2', colorMap.accent)}>{value}</p>
      <p className="text-xs text-text-muted leading-5">{hint}</p>
    </div>
  )
}

function ContextCard({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-bg-panel p-4">
      <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-text-faint">{label}</p>
      <p className="mt-1 text-[18px] font-semibold text-text-base">{value}</p>
      <p className="mt-2 text-xs text-text-muted leading-5">{desc}</p>
    </div>
  )
}
