'use client'

/**
 * KycWizard — модальный пошаговый мастер KYC.
 *
 * Шаги:
 *  phone     → ввод +7XXXXXXXXXX → SMS-код → подтверждение
 *  iin       → ввод 12-значного ИИН (РК), валидация контрольной суммы на бэке
 *  document  → выбор типа (NationalId/Passport/ResidencePermit) + загрузка фото
 *  done      → успех
 *
 * Безопасность UI:
 *  - Файлы валидируются по MIME и размеру до отправки (бэк всё равно пересмотрит).
 *  - Селфи + документ обязательны.
 *  - Никаких клиентских секретов — все ключи на бэкенде.
 */

import { useEffect, useRef, useState } from 'react'
import { X, Phone, IdCard, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { api, ApiError, KycDocumentType, type KycStatusDto } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LegalKycForm } from './LegalKycForm'

type Step = 'phone' | 'iin' | 'document' | 'done'

interface KycWizardProps {
  startStep?: Step
  initialStatus?: KycStatusDto | null
  onClose: () => void
  onComplete?: () => void
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024  // 10 MB
const MIN_BYTES = 4 * 1024          // 4 KB

function validateFile(f: File | null, label: string): string | null {
  if (!f) return `${label}: файл обязателен`
  if (!ALLOWED_MIME.includes(f.type)) return `${label}: только JPG, PNG или PDF`
  if (f.size > MAX_BYTES) return `${label}: размер не должен превышать 10 MB`
  if (f.size < MIN_BYTES) return `${label}: файл слишком мал (мин. 4 KB)`
  return null
}

export function KycWizard({ startStep = 'phone', initialStatus, onClose, onComplete }: KycWizardProps) {
  // Если телефон уже подтверждён — пропускаем шаг.
  // Если ИИН задан — переходим сразу к документу.
  const computedStart: Step = (() => {
    if (startStep !== 'phone') return startStep
    if (!initialStatus) return 'phone'
    if (!initialStatus.isPhoneVerified) return 'phone'
    if (!initialStatus.hasIin) return 'iin'
    return 'document'
  })()

  const [step, setStep] = useState<Step>(computedStart)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Закрытие по Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kyc-wizard-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border bg-bg-card shadow-glow-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 id="kyc-wizard-title" className="text-lg font-bold text-text-base">
            Верификация (KYC)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-base transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper (только для Individual) */}
        {initialStatus?.accountType !== 'Company' && <Stepper current={step} />}

        {/* Body */}
        <div className="p-5">
          {err && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-300 flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}

          {initialStatus?.accountType === 'Company' ? (
            <LegalKycForm
              onComplete={() => { onComplete?.() }}
            />
          ) : (
            <>
              {step === 'phone' && (
                <PhoneStep
                  busy={busy}
                  setBusy={setBusy}
                  setErr={setErr}
                  onDone={() => { setErr(null); setStep('iin') }}
                />
              )}

              {step === 'iin' && (
                <IinStep
                  busy={busy}
                  setBusy={setBusy}
                  setErr={setErr}
                  onDone={() => { setErr(null); setStep('document') }}
                  onSkip={() => { setErr(null); setStep('document') }}
                />
              )}

              {step === 'document' && (
                <DocumentStep
                  busy={busy}
                  setBusy={setBusy}
                  setErr={setErr}
                  onDone={() => { setErr(null); setStep('done'); onComplete?.() }}
                />
              )}

              {step === 'done' && (
                <div className="text-center py-6 space-y-4">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                  <h3 className="text-lg font-semibold text-text-base">Документ отправлен!</h3>
                  <p className="text-sm text-text-muted">
                    Модератор проверит данные в течение 24 часов. Вы получите уведомление о результате.
                  </p>
                  <Button variant="default" size="md" onClick={onClose}>Закрыть</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'phone',    label: 'Телефон' },
    { id: 'iin',      label: 'ИИН' },
    { id: 'document', label: 'Документ' },
  ]
  const currentIdx = steps.findIndex(s => s.id === current)
  return (
    <ol className="flex items-center gap-2 px-5 py-3 border-b border-border" aria-label="Шаги верификации">
      {steps.map((s, i) => {
        const active = i === currentIdx
        const done = i < currentIdx || current === 'done'
        return (
          <li key={s.id} className="flex items-center gap-2 text-xs">
            <span
              aria-current={active ? 'step' : undefined}
              className={
                'w-6 h-6 rounded-full flex items-center justify-center font-semibold border ' +
                (done ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : active ? 'bg-accent/20 border-accent/40 text-accent-light'
                               : 'bg-bg-hover border-border text-text-muted')
              }
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={active ? 'text-text-base' : 'text-text-muted'}>{s.label}</span>
            {i < steps.length - 1 && <span className="text-text-muted mx-1">›</span>}
          </li>
        )
      })}
    </ol>
  )
}

// ─── Step 1: Phone ────────────────────────────────────────────────────────────

interface StepProps {
  busy: boolean
  setBusy: (v: boolean) => void
  setErr: (v: string | null) => void
  onDone: () => void
}

function PhoneStep({ busy, setBusy, setErr, onDone }: StepProps) {
  const [phone, setPhone] = useState('+7')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Тикер кулдауна для повторной отправки
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const sendCode = async () => {
    if (!/^\+7\d{10}$/.test(phone)) {
      setErr('Формат телефона: +7XXXXXXXXXX (11 цифр включая +7)')
      return
    }
    setErr(null); setBusy(true)
    try {
      await api.kyc.sendPhoneCode(phone)
      setCodeSent(true)
      setCooldown(60)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Не удалось отправить код')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { setErr('Код состоит из 6 цифр'); return }
    setErr(null); setBusy(true)
    try {
      await api.kyc.verifyPhone(phone, code)
      onDone()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Не удалось подтвердить код')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Phone className="w-4 h-4 text-accent-light" />
        <span>Подтверждение номера телефона</span>
      </div>

      <Input
        label="Номер телефона"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+77001234567"
        value={phone}
        disabled={codeSent || busy}
        onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
      />

      {!codeSent ? (
        <Button variant="default" size="md" onClick={sendCode} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Получить код
        </Button>
      ) : (
        <>
          <Input
            label="Код из SMS"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            value={code}
            disabled={busy}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <div className="flex items-center gap-3">
            <Button variant="default" size="md" onClick={verify} disabled={busy || code.length !== 6}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Подтвердить
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={sendCode}
              disabled={busy || cooldown > 0}
            >
              {cooldown > 0 ? `Отправить снова (${cooldown}с)` : 'Отправить снова'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Step 2: IIN ──────────────────────────────────────────────────────────────

function IinStep({ busy, setBusy, setErr, onDone, onSkip }: StepProps & { onSkip: () => void }) {
  const [iin, setIin] = useState('')

  const submit = async () => {
    if (!/^\d{12}$/.test(iin)) { setErr('ИИН — 12 цифр'); return }
    setErr(null); setBusy(true)
    try {
      await api.kyc.setIin(iin)
      onDone()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Не удалось сохранить ИИН')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <IdCard className="w-4 h-4 text-accent-light" />
        <span>Индивидуальный идентификационный номер (ИИН)</span>
      </div>

      <Input
        label="ИИН (12 цифр)"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="900101300123"
        maxLength={12}
        value={iin}
        disabled={busy}
        onChange={(e) => setIin(e.target.value.replace(/\D/g, '').slice(0, 12))}
      />

      <p className="text-xs text-text-muted leading-relaxed">
        Ваш ИИН шифруется (AES-GCM) и хранится только в защищённой форме.
        Поиск дубликатов выполняется по криптографической HMAC-метке.
      </p>

      <div className="flex items-center gap-3">
        <Button variant="default" size="md" onClick={submit} disabled={busy || iin.length !== 12}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Продолжить
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip} disabled={busy}>
          Пропустить (Lite)
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3: Document ─────────────────────────────────────────────────────────

function DocumentStep({ busy, setBusy, setErr, onDone }: StepProps) {
  const [docType, setDocType] = useState<typeof KycDocumentType[keyof typeof KycDocumentType]>(KycDocumentType.NationalId)
  const [front, setFront] = useState<File | null>(null)
  const [back,  setBack]  = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef  = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  const needsBack = docType === KycDocumentType.NationalId

  const submit = async () => {
    const errs: string[] = []
    const e1 = validateFile(front, 'Лицевая сторона');   if (e1) errs.push(e1)
    if (needsBack) {
      const e2 = validateFile(back, 'Обратная сторона'); if (e2) errs.push(e2)
    }
    const e3 = validateFile(selfie, 'Селфи');             if (e3) errs.push(e3)
    if (errs.length) { setErr(errs.join('. ')); return }

    setErr(null); setBusy(true)
    try {
      await api.kyc.uploadDocument(docType, front!, selfie!, needsBack ? back : null)
      // Финализируем Individual KYC: оборачиваем документ в submission,
      // запускаем AI-проверку и постановку в очередь модерации.
      try {
        await api.kyc.submitIndividual()
      } catch (e) {
        // submission уже мог существовать (повторная загрузка) — это не блокер.
        if (!(e instanceof ApiError)) throw e
      }
      onDone()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Не удалось загрузить документ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Upload className="w-4 h-4 text-accent-light" />
        <span>Загрузка документа удостоверения личности</span>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium tracking-wide text-text-muted">Тип документа</label>
        <select
          value={docType}
          onChange={(e) => setDocType(Number(e.target.value) as typeof docType)}
          disabled={busy}
          className="w-full h-10 px-3 rounded-lg bg-bg-input border border-border text-text-base focus:outline-none focus:ring-2 focus:ring-accent/60"
        >
          <option value={KycDocumentType.NationalId}>Удостоверение личности РК</option>
          <option value={KycDocumentType.Passport}>Паспорт</option>
          <option value={KycDocumentType.ResidencePermit}>Вид на жительство</option>
        </select>
      </div>

      <FilePicker
        label={needsBack ? 'Лицевая сторона' : 'Документ (страница с фото)'}
        file={front}
        inputRef={frontRef}
        onPick={setFront}
        disabled={busy}
      />

      {needsBack && (
        <FilePicker
          label="Обратная сторона"
          file={back}
          inputRef={backRef}
          onPick={setBack}
          disabled={busy}
        />
      )}

      <FilePicker
        label="Селфи с документом"
        file={selfie}
        inputRef={selfieRef}
        onPick={setSelfie}
        disabled={busy}
      />

      <p className="text-xs text-text-muted leading-relaxed">
        JPG / PNG / PDF, до 10 MB. Документы хранятся в зашифрованном частном бакете
        и доступны только модераторам по временной ссылке (5 мин).
      </p>

      <Button variant="default" size="md" onClick={submit} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Отправить на проверку
      </Button>
    </div>
  )
}

function FilePicker({
  label, file, inputRef, onPick, disabled,
}: {
  label: string
  file: File | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onPick: (f: File | null) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium tracking-wide text-text-muted">{label}</label>
      <div
        className="border border-dashed border-border rounded-lg px-3 py-3 flex items-center justify-between gap-3 hover:border-border-bright transition cursor-pointer"
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Upload className="w-4 h-4 text-text-muted flex-shrink-0" />
          <span className="text-sm text-text-base truncate">
            {file ? file.name : 'Выберите файл (JPG / PNG / PDF)'}
          </span>
        </div>
        {file && (
          <span className="text-xs text-text-muted flex-shrink-0">
            {(file.size / 1024).toFixed(0)} KB
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
