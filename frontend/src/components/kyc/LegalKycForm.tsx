'use client'

/**
 * LegalKycForm — форма KYC для юридических лиц (ТОО / АО / ИП).
 *
 * Шаги:
 *  1) Реквизиты юр. лица (форма + БИН + название). Кнопка "Подтянуть из реестра"
 *     вызывает /api/kyc/legal/lookup/{bin} — стаб statgov, заполняет поля.
 *  2) Ответственное лицо (роль + ФИО) и документы:
 *      - удостоверение ответственного (front + selfie, опц. back)
 *      - документ-основание (приказ / доверенность) — обязателен,
 *        кроме случая ИП с responsibleRole=Owner
 *      - регистрация компании (опц., если БИН не найден в реестре)
 *  3) Submit → /api/kyc/legal/submit → AI-проверка + модерация.
 *
 * Безопасность UI: валидация MIME/size до отправки; никаких клиентских секретов.
 */

import { useRef, useState } from 'react'
import { Building2, Search, Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  api, ApiError,
  type KycSubmissionSummaryDto,
  type LegalEntityLookupDto,
  type LegalKycFields,
  type ResponsibleRoleStr,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024
const MIN_BYTES = 4 * 1024

function validateFile(f: File | null, label: string): string | null {
  if (!f) return `${label}: файл обязателен`
  if (!ALLOWED_MIME.includes(f.type)) return `${label}: только JPG, PNG или PDF`
  if (f.size > MAX_BYTES) return `${label}: размер не должен превышать 10 MB`
  if (f.size < MIN_BYTES) return `${label}: файл слишком мал (мин. 4 KB)`
  return null
}

interface Props {
  onComplete: (s: KycSubmissionSummaryDto) => void
}

const ROLE_OPTIONS: { value: ResponsibleRoleStr; label: string }[] = [
  { value: 'Director',   label: 'Директор / руководитель' },
  { value: 'Owner',      label: 'Учредитель / владелец' },
  { value: 'Proxy',      label: 'По доверенности' },
  { value: 'Accountant', label: 'Главный бухгалтер' },
]

export function LegalKycForm({ onComplete }: Props) {
  // ── form fields ──────────────────────────────────────
  const [legalForm, setLegalForm]   = useState<LegalKycFields['legalForm']>('ТОО')
  const [bin, setBin]               = useState('')
  const [legalName, setLegalName]   = useState('')
  const [legalAddress, setLegalAddress] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [responsibleRole, setResponsibleRole] = useState<ResponsibleRoleStr>('Director')
  const [responsibleName, setResponsibleName] = useState('')

  // ── files ────────────────────────────────────────────
  const [idFront, setIdFront]   = useState<File | null>(null)
  const [idBack, setIdBack]     = useState<File | null>(null)
  const [idSelfie, setIdSelfie] = useState<File | null>(null)
  const [authority, setAuthority]     = useState<File | null>(null)
  const [companyReg, setCompanyReg]   = useState<File | null>(null)

  const idFrontRef    = useRef<HTMLInputElement>(null)
  const idBackRef     = useRef<HTMLInputElement>(null)
  const idSelfieRef   = useRef<HTMLInputElement>(null)
  const authorityRef  = useRef<HTMLInputElement>(null)
  const companyRegRef = useRef<HTMLInputElement>(null)

  // ── ui state ─────────────────────────────────────────
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState<string | null>(null)
  const [lookupResult, setLookupResult] = useState<LegalEntityLookupDto | null | undefined>(undefined)
  // undefined = не искали; null = не найдено; объект = найдено
  const [done, setDone]   = useState<KycSubmissionSummaryDto | null>(null)

  const isIpOwner = legalForm === 'ИП' && responsibleRole === 'Owner'
  const authorityRequired = !isIpOwner

  const lookup = async () => {
    setErr(null)
    if (!/^\d{12}$/.test(bin)) { setErr('БИН — 12 цифр'); return }
    setBusy(true)
    try {
      const info = await api.kyc.lookupBin(bin)
      setLookupResult(info)
      // autofill безопасный: только если поле пустое
      if (!legalName) setLegalName(info.name)
      if (!legalAddress && info.address) setLegalAddress(info.address)
      if (!responsibleName && info.director) setResponsibleName(info.director)
      if (info.legalForm === 'ТОО' || info.legalForm === 'АО' || info.legalForm === 'ИП') {
        setLegalForm(info.legalForm)
      }
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 404) {
        setLookupResult(null)
        setErr('БИН не найден в реестре. Заполните вручную и приложите свидетельство о регистрации.')
      } else {
        setErr(e instanceof ApiError ? e.message : 'Не удалось обратиться к реестру')
      }
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    const errs: string[] = []
    if (!/^\d{12}$/.test(bin))               errs.push('БИН: 12 цифр')
    if (legalName.trim().length < 3)         errs.push('Наименование: минимум 3 символа')
    if (responsibleName.trim().length < 3)   errs.push('ФИО ответственного: минимум 3 символа')

    const e1 = validateFile(idFront,  'Удостоверение (лиц.)');           if (e1) errs.push(e1)
    const e2 = validateFile(idSelfie, 'Селфи с удостоверением');         if (e2) errs.push(e2)
    if (authorityRequired) {
      const e3 = validateFile(authority, 'Документ-основание');           if (e3) errs.push(e3)
    }
    // back и companyReg опциональны — валидируем только если выбраны
    if (idBack)    { const e = validateFile(idBack, 'Удостоверение (обр.)');     if (e) errs.push(e) }
    if (companyReg){ const e = validateFile(companyReg, 'Свидетельство');         if (e) errs.push(e) }

    if (errs.length) { setErr(errs.join('. ')); return }

    setErr(null); setBusy(true)
    try {
      const fields: LegalKycFields = {
        legalForm, bin, legalName,
        legalAddress: legalAddress || null,
        contactPhone: contactPhone || null,
        responsibleRole,
        responsibleName,
      }
      const res = await api.kyc.submitLegal(fields, {
        responsibleIdFront:  idFront!,
        responsibleIdSelfie: idSelfie!,
        responsibleIdBack:   idBack,
        authorityDocument:   authority,
        companyRegistration: companyReg,
      })
      setDone(res)
      onComplete(res)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Не удалось отправить заявку')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-6 space-y-4">
        <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
        <h3 className="text-lg font-semibold text-text-base">Заявка отправлена</h3>
        <p className="text-sm text-text-muted">
          Решение AI: <span className="font-mono">{done.aiDecision ?? '—'}</span>.
          {done.status === 'AiRejected'
            ? ' Заявка автоматически отклонена — см. причину в кабинете.'
            : ' Модератор проверит документы в течение 24 часов.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Building2 className="w-4 h-4 text-accent-light" />
        <span>Верификация юридического лица</span>
      </div>

      {err && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-300 flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* ── 1. Legal entity ─────────────────────────── */}
      <fieldset className="space-y-3 border border-border rounded-xl p-4">
        <legend className="px-2 text-xs uppercase tracking-wider text-text-muted">Реквизиты</legend>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Форма</label>
            <select
              value={legalForm}
              onChange={(e) => setLegalForm(e.target.value as LegalKycFields['legalForm'])}
              disabled={busy}
              className="w-full h-10 px-3 rounded-lg bg-bg-input border border-border text-text-base focus:outline-none focus:ring-2 focus:ring-accent/60"
            >
              <option value="ТОО">ТОО</option>
              <option value="АО">АО</option>
              <option value="ИП">ИП</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-text-muted">БИН (12 цифр)</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="991240000123"
                maxLength={12}
                value={bin}
                disabled={busy}
                onChange={(e) => setBin(e.target.value.replace(/\D/g, '').slice(0, 12))}
                className="flex-1 h-10 px-3 rounded-lg bg-bg-input border border-border text-text-base focus:outline-none focus:ring-2 focus:ring-accent/60"
              />
              <Button variant="ghost" size="sm" onClick={lookup} disabled={busy || bin.length !== 12}>
                <Search className="w-4 h-4" /> Найти
              </Button>
            </div>
            {lookupResult && (
              <p className="text-xs text-emerald-400">
                ✓ {lookupResult.legalForm} {lookupResult.name}{lookupResult.director ? ` · ${lookupResult.director}` : ''}
              </p>
            )}
          </div>
        </div>

        <Input
          label="Полное наименование"
          type="text"
          placeholder='Например: ТОО "Барнамаж"'
          value={legalName}
          disabled={busy}
          onChange={(e) => setLegalName(e.target.value.slice(0, 256))}
        />

        <Input
          label="Юридический адрес (опц.)"
          type="text"
          value={legalAddress}
          disabled={busy}
          onChange={(e) => setLegalAddress(e.target.value.slice(0, 512))}
        />

        <Input
          label="Контактный телефон (опц.)"
          type="tel"
          placeholder="+77001234567"
          value={contactPhone}
          disabled={busy}
          onChange={(e) => setContactPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 32))}
        />
      </fieldset>

      {/* ── 2. Responsible person ──────────────────── */}
      <fieldset className="space-y-3 border border-border rounded-xl p-4">
        <legend className="px-2 text-xs uppercase tracking-wider text-text-muted">Ответственное лицо</legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Роль</label>
            <select
              value={responsibleRole}
              onChange={(e) => setResponsibleRole(e.target.value as ResponsibleRoleStr)}
              disabled={busy}
              className="w-full h-10 px-3 rounded-lg bg-bg-input border border-border text-text-base focus:outline-none focus:ring-2 focus:ring-accent/60"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <Input
            label="ФИО полностью"
            type="text"
            placeholder="Иванов Иван Иванович"
            value={responsibleName}
            disabled={busy}
            onChange={(e) => setResponsibleName(e.target.value.slice(0, 256))}
          />
        </div>

        <FilePicker label="Удостоверение / паспорт (лицевая)" file={idFront}
          inputRef={idFrontRef} onPick={setIdFront} disabled={busy} />
        <FilePicker label="Удостоверение (обратная) — опц." file={idBack}
          inputRef={idBackRef}  onPick={setIdBack}  disabled={busy} />
        <FilePicker label="Селфи с удостоверением" file={idSelfie}
          inputRef={idSelfieRef} onPick={setIdSelfie} disabled={busy} />

        <FilePicker
          label={
            authorityRequired
              ? 'Документ-основание (приказ / доверенность / решение)'
              : 'Документ-основание — не требуется для ИП-владельца'
          }
          file={authority}
          inputRef={authorityRef}
          onPick={setAuthority}
          disabled={busy || !authorityRequired}
        />

        {(lookupResult === null || lookupResult === undefined) && (
          <FilePicker
            label="Свидетельство о регистрации (если БИН не найден в реестре)"
            file={companyReg}
            inputRef={companyRegRef}
            onPick={setCompanyReg}
            disabled={busy}
          />
        )}

        <p className="text-xs text-text-muted leading-relaxed">
          Все документы шифруются и доступны только модераторам по временной ссылке (5 мин).
          AI выполнит первичную проверку, окончательное решение принимает модератор.
        </p>
      </fieldset>

      <Button variant="default" size="md" onClick={submit} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Отправить заявку
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
        className={
          'border border-dashed rounded-lg px-3 py-3 flex items-center justify-between gap-3 transition ' +
          (disabled
            ? 'border-border/50 opacity-50 cursor-not-allowed'
            : 'border-border hover:border-border-bright cursor-pointer')
        }
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
