'use client'

/**
 * KycPanel — embeddable панель KYC-статуса.
 * Используется на /dashboard/profile (раздел "Верификация").
 *
 * Сценарий:
 *  - None        → CTA "Пройти верификацию" → открывает KycWizard
 *  - Lite        → бейдж "Базовая верификация", CTA "Полная верификация (документ)"
 *  - DocPending  → бейдж "На проверке", без CTA
 *  - Full        → бейдж "Полностью подтверждён"
 *  - Rejected    → бейдж "Отклонено" + причина + CTA "Повторить"
 */

import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, ShieldQuestion, Clock, RefreshCcw } from 'lucide-react'
import { api, ApiError, type KycStatusDto, type KycStatusValue } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { KycWizard } from './KycWizard'

const STATUS_META: Record<KycStatusValue, { label: string; color: string; Icon: typeof ShieldCheck; description: string }> = {
  None:       { label: 'Не пройдена',           color: 'text-text-muted',  Icon: ShieldQuestion, description: 'Подтвердите телефон и ИИН для базового уровня доступа.' },
  Lite:       { label: 'Базовая (Lite)',        color: 'text-cyan-400',    Icon: ShieldCheck,    description: 'Телефон и ИИН подтверждены. Загрузите документ для полной верификации.' },
  DocPending: { label: 'Документ на проверке',  color: 'text-yellow-400',  Icon: Clock,          description: 'Документ отправлен модератору. Это занимает до 24 часов.' },
  Full:       { label: 'Полная верификация',    color: 'text-emerald-400', Icon: ShieldCheck,    description: 'Аккаунт полностью верифицирован. Доступны все функции платформы.' },
  Rejected:   { label: 'Отклонено',              color: 'text-red-400',     Icon: ShieldAlert,    description: 'Документ отклонён модератором. Ознакомьтесь с причиной и загрузите снова.' },
}

export function KycPanel() {
  const [status, setStatus] = useState<KycStatusDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)

  const refresh = async () => {
    setErr(null)
    try {
      const s = await api.kyc.getStatus()
      setStatus(s)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Не удалось загрузить статус KYC')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  // Авто-открытие визарда после регистрации: /dashboard/settings?section=verification&kyc=open
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('kyc') === 'open') {
      setWizardOpen(true)
      // Чистим query, чтобы повторные открытия страницы не поднимали модалку.
      params.delete('kyc')
      const qs = params.toString()
      const url = window.location.pathname + (qs ? `?${qs}` : '')
      window.history.replaceState({}, '', url)
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6 animate-pulse">
        <div className="h-5 w-40 bg-bg-hover rounded mb-3" />
        <div className="h-4 w-full bg-bg-hover rounded" />
      </div>
    )
  }

  if (err || !status) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-6 flex items-center justify-between">
        <p className="text-sm text-red-400">{err ?? 'Ошибка загрузки KYC'}</p>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCcw className="w-4 h-4" /> Повторить
        </Button>
      </div>
    )
  }

  const meta = STATUS_META[status.status]
  const Icon = meta.Icon

  // Определяем CTA
  const showWizardForLite = status.status === 'None' || status.status === 'Rejected'
  const ctaLabel =
    status.status === 'None'       ? 'Пройти верификацию' :
    status.status === 'Rejected'   ? 'Повторить отправку' :
    status.status === 'Lite'       ? 'Полная верификация (документ)' :
    null

  return (
    <>
      <div className="rounded-xl border border-border bg-bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-bg-hover ${meta.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-base">Верификация личности</h3>
              <p className={`text-sm font-medium ${meta.color}`}>{meta.label}</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-text-muted leading-relaxed">{meta.description}</p>

        {/* Подробности */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex justify-between border border-border rounded-lg px-3 py-2">
            <dt className="text-text-muted">Телефон</dt>
            <dd className={status.isPhoneVerified ? 'text-emerald-400' : 'text-text-muted'}>
              {status.isPhoneVerified ? status.phone : 'не подтверждён'}
            </dd>
          </div>
          <div className="flex justify-between border border-border rounded-lg px-3 py-2">
            <dt className="text-text-muted">ИИН</dt>
            <dd className={status.hasIin ? 'text-emerald-400' : 'text-text-muted'}>
              {status.hasIin ? status.iinMasked : 'не указан'}
            </dd>
          </div>
        </dl>

        {/* Причина отказа */}
        {status.status === 'Rejected' && status.latestDocument?.rejectionReason && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-300">
            <span className="font-semibold">Причина:</span> {status.latestDocument.rejectionReason}
          </div>
        )}

        {ctaLabel && (
          <Button variant="default" size="md" onClick={() => setWizardOpen(true)}>
            {ctaLabel}
          </Button>
        )}
      </div>

      {wizardOpen && (
        <KycWizard
          startStep={showWizardForLite ? 'phone' : 'document'}
          initialStatus={status}
          onClose={() => setWizardOpen(false)}
          onComplete={() => { setWizardOpen(false); refresh() }}
        />
      )}
    </>
  )
}
