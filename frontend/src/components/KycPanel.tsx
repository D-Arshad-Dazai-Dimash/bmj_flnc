'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Phone, BadgeCheck, AlertCircle } from 'lucide-react'
import { api, ApiError, type KycStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  None:     { text: 'Не подтверждён',    color: 'text-text-muted' },
  Lite:     { text: 'KYC Lite',          color: 'text-emerald-400' },
  Full:     { text: 'KYC Full',          color: 'text-emerald-400' },
  Rejected: { text: 'Отклонён',          color: 'text-red-400' },
}

/**
 * Панель подтверждения личности: телефон (SMS-OTP) + ИИН.
 * После завершения обоих шагов KYC-статус переходит в Lite автоматически.
 */
export function KycPanel() {
  const [status, setStatus] = useState<KycStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.kyc.status()
      .then(s => { if (!cancelled) setStatus(s) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6 text-sm text-text-muted">
        Загрузка статуса KYC…
      </div>
    )
  }

  const label = STATUS_LABEL[status?.status ?? 'None'] ?? STATUS_LABEL.None

  return (
    <div className="rounded-xl border border-border bg-bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-text-muted" />
        <h2 className="text-sm font-semibold text-text-base">Подтверждение личности</h2>
        <span className={`ml-auto text-xs font-medium ${label.color}`}>{label.text}</span>
      </div>
      <p className="text-xs text-text-muted">
        Подтвердите телефон и укажите ИИН — это требуется для участия в денежных операциях
        (закон РК «О ПОД/ФТ»). Документы не запрашиваем.
      </p>

      <PhoneSection status={status} onUpdate={setStatus} />
      <IinSection   status={status} onUpdate={setStatus} />
    </div>
  )
}

function PhoneSection({ status, onUpdate }:
  { status: KycStatus | null; onUpdate: (s: KycStatus) => void }) {
  const [phone, setPhone] = useState(status?.phone ?? '')
  const [code,  setCode]  = useState('')
  const [stage, setStage] = useState<'idle' | 'sent'>('idle')
  const [busy,  setBusy]  = useState(false)
  const [msg,   setMsg]   = useState<{ ok: boolean; text: string } | null>(null)

  const verified = status?.phoneVerified === true

  const send = async () => {
    setBusy(true); setMsg(null)
    try {
      await api.kyc.sendPhoneCode(phone)
      setStage('sent')
      setMsg({ ok: true, text: 'Код отправлен. В dev-режиме код виден в логах API.' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Ошибка отправки' })
    } finally { setBusy(false) }
  }

  const verify = async () => {
    setBusy(true); setMsg(null)
    try {
      const next = await api.kyc.verifyPhone(phone, code)
      onUpdate(next)
      setStage('idle'); setCode('')
      setMsg({ ok: true, text: 'Телефон подтверждён.' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Ошибка' })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center gap-2 text-sm font-medium text-text-base">
        <Phone className="w-4 h-4" />
        Телефон
        {verified && <BadgeCheck className="w-4 h-4 text-emerald-400" />}
      </div>
      {verified ? (
        <p className="text-sm text-text-muted">Подтверждён: <span className="text-text-base">{status?.phone}</span></p>
      ) : (
        <>
          <Input
            label="Номер в международном формате"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+77011234567"
          />
          {stage === 'sent' && (
            <Input
              label="Код из SMS"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
            />
          )}
          {msg && (
            <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
          )}
          <div className="flex gap-2">
            {stage === 'idle' ? (
              <Button variant="outline" size="sm" loading={busy} onClick={send}
                      disabled={!phone.match(/^\+\d{10,15}$/)}>
                Отправить код
              </Button>
            ) : (
              <>
                <Button variant="default" size="sm" loading={busy} onClick={verify}
                        disabled={code.length !== 6}>
                  Подтвердить
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setStage('idle'); setMsg(null) }}>
                  Отмена
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function IinSection({ status, onUpdate }:
  { status: KycStatus | null; onUpdate: (s: KycStatus) => void }) {
  const [iin,     setIin]     = useState('')
  const [consent, setConsent] = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  const has = status?.hasIin === true

  const submit = async () => {
    setBusy(true); setMsg(null)
    try {
      const next = await api.kyc.setIin(iin, consent)
      onUpdate(next)
      setIin('')
      setMsg({ ok: true, text: 'ИИН сохранён.' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Ошибка' })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center gap-2 text-sm font-medium text-text-base">
        <BadgeCheck className="w-4 h-4" />
        ИИН
        {has && <span className="text-xs text-emerald-400">сохранён</span>}
      </div>
      {has ? (
        <p className="text-xs text-text-muted">
          ИИН записан в зашифрованном виде. Изменение через поддержку.
        </p>
      ) : (
        <>
          <Input
            label="ИИН (12 цифр)"
            value={iin}
            onChange={e => setIin(e.target.value.replace(/\D/g, '').slice(0, 12))}
            placeholder="000000000000"
          />
          <label className="flex items-start gap-2 text-xs text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="accent-violet-600 mt-0.5"
            />
            <span>
              Я согласен на обработку персональных данных в соответствии с законом РК
              «О персональных данных и их защите».
            </span>
          </label>
          {msg && (
            <p className={`text-xs flex items-start gap-1 ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {!msg.ok && <AlertCircle className="w-3 h-3 mt-0.5" />}
              {msg.text}
            </p>
          )}
          <Button variant="outline" size="sm" loading={busy} onClick={submit}
                  disabled={iin.length !== 12 || !consent}>
            Сохранить ИИН
          </Button>
        </>
      )}
    </div>
  )
}
