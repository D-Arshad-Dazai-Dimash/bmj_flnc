'use client'

/**
 * /admin/kyc — очередь KYC-заявок (submissions).
 *
 * Вкладки: Все / Физлица / Юрлица.
 * Для каждой заявки показываем AI-вердикт, поля юр. лица (для Legal),
 * превью документов (presigned URL, TTL 5 мин) и кнопки Approve / Reject.
 *
 * Доступ: minRole=Moderator (контролируется AdminLayout).
 */

import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, Building2, User as UserIcon, Loader2, RefreshCcw, ExternalLink } from 'lucide-react'
import {
  api, ApiError,
  type PendingSubmissionDto,
  type KycSubmissionKindStr,
} from '@/lib/api'
import { Button } from '@/components/ui/button'

type Tab = 'all' | 'Individual' | 'Legal'

export default function AdminKycPage() {
  const [tab, setTab]         = useState<Tab>('all')
  const [items, setItems]     = useState<PendingSubmissionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setErr(null)
    try {
      const kind: KycSubmissionKindStr | undefined =
        tab === 'all' ? undefined : (tab as KycSubmissionKindStr)
      const list = await api.adminKyc.listSubmissions(kind, 100)
      setItems(list)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Не удалось загрузить очередь')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab])

  const onApprove = async (id: string) => {
    if (!confirm('Подтвердить заявку и выдать пользователю Full KYC?')) return
    try {
      await api.adminKyc.approveSubmission(id)
      setItems((xs) => xs.filter((x) => x.id !== id))
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Ошибка')
    }
  }

  const onReject = async (id: string) => {
    const reason = prompt('Причина отклонения (5–500 символов):')?.trim()
    if (!reason || reason.length < 5) return
    try {
      await api.adminKyc.rejectSubmission(id, reason)
      setItems((xs) => xs.filter((x) => x.id !== id))
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Ошибка')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-base flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-accent-light" />
            KYC: модерация заявок
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Подтверждение AI-обработанных заявок. Approve выдаёт Full KYC.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className="w-4 h-4" /> Обновить
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['all', 'Individual', 'Legal'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'px-4 py-2 text-sm font-medium border-b-2 transition ' +
              (tab === t
                ? 'border-accent text-text-base'
                : 'border-transparent text-text-muted hover:text-text-base')
            }
          >
            {t === 'all' ? 'Все' : t === 'Individual' ? 'Физлица' : 'Юрлица'}
          </button>
        ))}
      </div>

      {err && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-muted py-12 text-center">Очередь пуста.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((s) => (
            <SubmissionCard key={s.id} s={s} onApprove={onApprove} onReject={onReject} />
          ))}
        </ul>
      )}
    </div>
  )
}

function SubmissionCard({
  s, onApprove, onReject,
}: {
  s: PendingSubmissionDto
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const isLegal = s.kind === 'Legal'
  const aiBadge =
    s.aiDecision === 'reject'  ? 'bg-red-500/15 text-red-300 border-red-500/40' :
    s.aiDecision === 'approve' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' :
                                 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40'

  return (
    <li className="rounded-xl border border-border bg-bg-card p-5 space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-bg-hover text-accent-light">
            {isLegal ? <Building2 className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-base">
              {isLegal ? `${s.legalForm ?? '—'} ${s.legalName ?? ''}` : 'Физическое лицо'}
            </h3>
            <p className="text-xs text-text-muted">
              {s.userEmail} · подано {new Date(s.createdAt).toLocaleString('ru-RU')}
            </p>
          </div>
        </div>

        {s.aiDecision && (
          <div className={`rounded-lg border px-3 py-2 text-xs ${aiBadge}`}>
            <div className="font-semibold mb-0.5">
              AI: {s.aiDecision} {s.aiConfidence != null && `(${Math.round(s.aiConfidence * 100)}%)`}
            </div>
            {s.aiReasoning && <div className="opacity-80">{s.aiReasoning}</div>}
          </div>
        )}
      </header>

      {isLegal && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {s.bin             && <Field k="БИН" v={s.bin} />}
          {s.legalAddress    && <Field k="Адрес" v={s.legalAddress} />}
          {s.contactPhone    && <Field k="Телефон" v={s.contactPhone} />}
          {s.responsibleRole && <Field k="Ответственный" v={`${s.responsibleRole}: ${s.responsibleName ?? ''}`} />}
        </dl>
      )}

      {/* Documents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {s.documents.map((d) => (
          <div key={d.id} className="rounded-lg border border-border bg-bg-input p-3 space-y-2">
            <p className="text-xs font-semibold text-text-base">{d.documentType}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <DocLink label="Лиц." href={d.frontUrl} />
              {d.backUrl && <DocLink label="Обр." href={d.backUrl} />}
              <DocLink label="Селфи" href={d.selfieUrl} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button variant="default" size="sm" onClick={() => onApprove(s.id)}>
          <ShieldCheck className="w-4 h-4" /> Подтвердить
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onReject(s.id)}>
          <ShieldAlert className="w-4 h-4" /> Отклонить
        </Button>
      </div>
    </li>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border border-border rounded-md px-2 py-1.5">
      <dt className="text-text-muted">{k}</dt>
      <dd className="text-text-base text-right truncate">{v}</dd>
    </div>
  )
}

function DocLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg-card border border-border text-text-base hover:border-accent/60 transition"
    >
      {label} <ExternalLink className="w-3 h-3" />
    </a>
  )
}
