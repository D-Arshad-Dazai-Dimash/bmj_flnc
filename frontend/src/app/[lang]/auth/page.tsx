'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import Image from 'next/image'
import Link from '@/components/ui/LocaleLink'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck, BriefcaseBusiness, Code2, Sparkles, Shield, Orbit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, toBackendAccountType } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import MatrixRain from '@/components/MatrixRain'

const LOGO_SRC = '/logoBarnamajMini.png'

type Mode = 'login' | 'register'
type Acct = 'Developer' | 'Client'

// ─── Password strength (NIST 2024+) ──────────────────────────────────────────
// Длина важнее искусственной сложности. 0..4.
function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; cls: string } {
  if (!pw) return { score: 0, label: '', cls: '' }
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (pw.length >= 16) s++
  if (/[^A-Za-z0-9]/.test(pw) || (/[A-Z]/.test(pw) && /[0-9]/.test(pw))) s++
  const score = Math.min(s, 4) as 0 | 1 | 2 | 3 | 4
  const map = [
    { label: 'Очень слабый', cls: 'bg-red-500' },
    { label: 'Слабый',       cls: 'bg-red-400' },
    { label: 'Средний',      cls: 'bg-amber-400' },
    { label: 'Хороший',      cls: 'bg-emerald-400' },
    { label: 'Отличный',     cls: 'bg-emerald-500' },
  ]
  return { score, label: map[score].label, cls: map[score].cls }
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Password input with show/hide ───────────────────────────────────────────
function PasswordInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  id,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  autoComplete: string
  id?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <Input
      id={id}
      label={label}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={e => onChange(e.target.value)}
      error={error}
      placeholder={placeholder}
      autoComplete={autoComplete}
      suffix={
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="text-text-muted hover:text-text-base transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
    />
  )
}

// ─── Account type selector ───────────────────────────────────────────────────
function AccountTypeSelector({ value, onChange }: { value: Acct; onChange: (v: Acct) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-[510] tracking-caption text-text-secondary">Тип аккаунта</span>
      <div className="grid grid-cols-2 gap-2">
        {(['Developer', 'Client'] as Acct[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-pressed={value === t}
            className={cn(
              'py-3 px-4 rounded-[10px] text-sm border transition-all duration-200 text-left bg-bg-card hover:bg-bg-elevated',
              value === t
                ? t === 'Developer'
                  ? 'border-[rgba(72,152,188,0.35)] text-[#91d1e4] shadow-[0_0_0_1px_rgba(72,152,188,0.08)]'
                  : 'border-[rgba(122,88,172,0.35)] text-[#d8b2cb] shadow-[0_0_0_1px_rgba(122,88,172,0.08)]'
                : 'border-border text-text-secondary hover:border-border-bright hover:text-text-base',
            )}
          >
            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-bg-panel">
              {t === 'Developer' ? (
                <Code2 className="h-4 w-4 text-[#91d1e4]" />
              ) : (
                <BriefcaseBusiness className="h-4 w-4 text-[#d8b2cb]" />
              )}
            </span>
            <span className="font-[510] tracking-caption">
              {t === 'Developer' ? 'Разработчик' : 'Заказчик'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main form ───────────────────────────────────────────────────────────────
interface AuthFormProps {
  mode: Mode
  acct: Acct
  onAcctChange: (a: Acct) => void
}

function AuthForm({ mode, acct, onAcctChange }: AuthFormProps) {
  const router = useLocaleRouter()
  const { login, register } = useAuth()

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errMsg,  setErrMsg]  = useState<string | null>(null)

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [consent,  setConsent]  = useState(false)
  const [touched,  setTouched]  = useState<Record<string, boolean>>({})

  // ── ТОО/ИП поля (только для Client/Company) ───────────────
  const [legalForm,       setLegalForm]       = useState('ТОО')
  const [bin,             setBin]             = useState('')
  const [legalName,       setLegalName]       = useState('')
  const [legalAddress,    setLegalAddress]    = useState('')
  const [directorName,    setDirectorName]    = useState('')
  const [contactPhone,    setContactPhone]    = useState('')
  const [iinEntrepreneur, setIinEntrepreneur] = useState('')
  // reset on mode flip
  useEffect(() => {
    setErrMsg(null)
    setSuccess(false)
    setName('')
    setPassword('')
    setConsent(false)
    setTouched({})
  }, [mode])

  // ── Live validation ────────────────────────────────────────
  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (mode === 'register' && !name.trim()) e.name = 'Введите имя'
    if (!email.trim()) e.email = 'Введите email'
    else if (!EMAIL_RX.test(email)) e.email = 'Некорректный формат email'
    if (!password) e.password = 'Введите пароль'
    else if (mode === 'register' && password.length < 8) e.password = 'Минимум 8 символов'
    else if (password.length > 128) e.password = 'Максимум 128 символов'
    if (mode === 'register' && !consent) e.consent = 'Требуется согласие'
    return e
  }, [mode, name, email, password, consent])

  const fieldErr = (k: string): string | undefined => (touched[k] ? errors[k] : undefined)
  const formValid = Object.keys(errors).length === 0

  const pw = useMemo(() => scorePassword(password), [password])

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setTouched({ name: true, email: true, password: true, consent: true })
    if (!formValid) return

    setLoading(true)
    setErrMsg(null)

    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register({
          email: email.trim(),
          password,
          name: name.trim(),
          accountType: toBackendAccountType(acct),
          ...(acct === 'Client' ? {
            legalForm:       legalForm || undefined,
            bin:             bin.trim() || undefined,
            legalName:       legalName.trim() || undefined,
            legalAddress:    legalAddress.trim() || undefined,
            directorName:    directorName.trim() || undefined,
            contactPhone:    contactPhone.trim() || undefined,
            iinEntrepreneur: legalForm === 'ИП' ? iinEntrepreneur.trim() || undefined : undefined,
          } : {}),
        })
      }
      setSuccess(true)
      // После регистрации сразу ведём пользователя на верификацию (KYC),
      // после логина — на основной дашборд.
      const target = mode === 'register' ? '/dashboard/profile?kyc=open' : '/dashboard'
      setTimeout(() => router.push(target), 900)
    } catch (err) {
      // Универсальное сообщение для login (по NIST/OWASP не раскрываем детали).
      // Backend уже отдаёт "Неверный email или пароль" — пробрасываем как есть.
      if (err instanceof ApiError) setErrMsg(err.message)
      else if (err instanceof Error) setErrMsg(err.message)
      else setErrMsg('Что-то пошло не так. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      key={mode}
      onSubmit={handleSubmit}
      noValidate
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-4"
    >
      {mode === 'register' && (
        <AccountTypeSelector value={acct} onChange={onAcctChange} />
      )}

      {mode === 'register' && (
        <Input
          label={acct === 'Client' ? 'Название компании' : 'Ваше имя'}
          placeholder={acct === 'Client' ? 'ООО Барнамаж' : 'Имя Фамилия'}
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, name: true }))}
          error={fieldErr('name')}
          autoComplete="name"
          autoFocus
        />
      )}

      {/* ── ТОО/ИП реквизиты (только для Client) ── */}
      {mode === 'register' && acct === 'Client' && (
        <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-bg-card p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <p className="text-[11px] font-[510] tracking-caption text-text-secondary">Юридические реквизиты (необязательно)</p>

          {/* Форма организации */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-[510] tracking-caption text-text-secondary">Форма организации</span>
            <div className="flex gap-2">
              {['ТОО', 'АО', 'ИП'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setLegalForm(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-[8px] text-xs border transition-colors',
                    legalForm === f
                      ? 'border-[rgba(73,71,171,0.35)] bg-[rgba(73,71,171,0.12)] text-[#b5b3ff]'
                      : 'border-border bg-bg-panel text-text-secondary hover:border-border-bright',
                  )}
                >{f}</button>
              ))}
            </div>
          </div>

          <Input label="БИН" placeholder="123456789012" value={bin} onChange={e => setBin(e.target.value)} autoComplete="off" />
          {legalForm === 'ИП' && (
            <Input label="ИИН предпринимателя" placeholder="123456789012" value={iinEntrepreneur} onChange={e => setIinEntrepreneur(e.target.value)} autoComplete="off" />
          )}
          <Input label="Официальное название" placeholder="ТОО «Барнамаж»" value={legalName} onChange={e => setLegalName(e.target.value)} autoComplete="off" />
          <Input label="Юридический адрес" placeholder="г. Алматы, ул. ..." value={legalAddress} onChange={e => setLegalAddress(e.target.value)} autoComplete="off" />
          <Input label="ФИО директора" placeholder="Иванов Иван Иванович" value={directorName} onChange={e => setDirectorName(e.target.value)} autoComplete="off" />
          <Input label="Контактный телефон" type="tel" placeholder="+7 (777) 000-00-00" value={contactPhone} onChange={e => setContactPhone(e.target.value)} autoComplete="tel" />
        </div>
      )}

      <Input
        label="Email"
        type="email"
        inputMode="email"
        placeholder="you@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onBlur={() => setTouched(t => ({ ...t, email: true }))}
        error={fieldErr('email')}
        autoComplete="email"
        autoFocus={mode === 'login'}
      />

      <div className="flex flex-col gap-1.5">
        <PasswordInput
          label="Пароль"
          value={password}
          onChange={v => {
            setPassword(v)
            if (!touched.password) setTouched(t => ({ ...t, password: true }))
          }}
          error={fieldErr('password')}
          placeholder={mode === 'register' ? 'Минимум 8 символов' : '••••••••'}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        />

        {mode === 'register' && password && (
          <div className="flex flex-col gap-1 mt-0.5">
            <div className="flex gap-1" aria-hidden>
              {[0, 1, 2, 3].map(i => (
                <span
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    i < pw.score ? pw.cls : 'bg-bg-hover',
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-text-faint flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              {pw.label} · 12+ символов рекомендуется
            </span>
          </div>
        )}
      </div>

      {mode === 'login' && (
        <div className="flex items-center justify-between -mt-1">
          <label className="inline-flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-violet-500"
            />
            Запомнить меня
          </label>
          <a
            href="#"
            className="text-xs text-text-muted hover:text-accent-light transition-colors"
            onClick={e => {
              e.preventDefault()
              setErrMsg('Восстановление пароля скоро появится. Напишите в поддержку.')
            }}
          >
            Забыли пароль?
          </a>
        </div>
      )}

      {mode === 'register' && (
        <label className="inline-flex items-start gap-2 text-xs text-text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => {
              setConsent(e.target.checked)
              setTouched(t => ({ ...t, consent: true }))
            }}
            className="w-3.5 h-3.5 mt-0.5 rounded accent-violet-500"
          />
          <span>
            Я согласен с{' '}
            <Link href="/terms" className="text-accent-light hover:underline">
              условиями
            </Link>{' '}
            и{' '}
            <Link href="/privacy" className="text-accent-light hover:underline">
              политикой конфиденциальности
            </Link>
          </span>
        </label>
      )}
      {fieldErr('consent') && (
        <p className="text-xs text-red-400 -mt-2">{fieldErr('consent')}</p>
      )}

      <AnimatePresence>
        {errMsg && !success && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2.5 p-3 rounded-[10px] bg-red-500/10 border border-red-500/25 text-red-300 text-sm overflow-hidden"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {errMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2.5 p-3 rounded-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {mode === 'login' ? 'Добро пожаловать!' : 'Аккаунт создан! Перенаправляем...'}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        variant="default"
        size="lg"
        className="w-full mt-1"
        loading={loading}
        disabled={success}
      >
        {success
          ? 'Готово!'
          : mode === 'login'
          ? 'Войти в аккаунт'
          : acct === 'Client'
          ? 'Создать аккаунт заказчика'
          : 'Создать аккаунт разработчика'}
      </Button>
    </motion.form>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [acct, setAcct] = useState<Acct>('Developer')
  const logoSrc = LOGO_SRC

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-base">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,138,212,0.16),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(201,143,177,0.14),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(73,71,171,0.18),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid opacity-[0.14]" style={{ maskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 20%, transparent 82%)' }} />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-bg-card px-3 py-2 text-sm text-text-secondary transition-all duration-200 hover:bg-bg-elevated hover:text-text-base">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-[510] tracking-caption">Barnamaj</span>
        </Link>
        <div className="relative h-8 w-8 rounded-[10px] border border-border bg-bg-card p-1 shadow-[0_10px_30px_rgba(5,8,48,0.35)]">
          <Image
            src={logoSrc}
            alt="Barnamaj"
            fill
            sizes="32px"
            unoptimized
            className="object-contain p-1 drop-shadow-[0_0_8px_rgba(73,71,171,0.35)]"
          />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-6xl items-center px-4 pb-12 pt-2 sm:px-6">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="surface-card relative hidden overflow-hidden rounded-[20px] p-8 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(99,138,212,0.08),rgba(255,255,255,0.01)_38%,rgba(73,71,171,0.08))]" />
            <MatrixRain className="absolute inset-0 opacity-25" speed={50} />
            <div className="relative space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,138,212,0.24)] bg-[rgba(99,138,212,0.08)] px-3 py-1.5 text-[11px] font-[510] tracking-caption text-[#bed2ff]">
                <Sparkles className="h-3.5 w-3.5" />
                Private engineering marketplace
              </div>
              <div className="space-y-4">
                <h1 className="max-w-[11ch] text-5xl font-semibold leading-[0.96] tracking-display text-text-base">
                  Дорогой интерфейс для серьёзных сделок.
                </h1>
                <p className="max-w-xl text-[15px] leading-7 text-text-secondary">
                  Barnamaj соединяет заказчиков и сильные инженерные команды в интерфейсе,
                  который ощущается как премиальный рабочий инструмент, а не биржа фриланса.
                </p>
              </div>
            </div>

            <div className="relative grid gap-3 sm:grid-cols-3">
              {[
                { icon: Shield, title: 'KYC-first', text: 'Верификация включается в онбординг и снижает шум.' },
                { icon: Orbit, title: 'Escrow-ready', text: 'Флоу готовы под сделки с повышенным доверием.' },
                { icon: Sparkles, title: 'AI assisted', text: 'Создание ТЗ и оценка команды встроены в продукт.' },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-[14px] border border-border bg-[rgba(255,255,255,0.03)] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-bg-panel">
                      <Icon className="h-4 w-4 text-[#9db4ff]" />
                    </div>
                    <p className="text-[13px] font-[510] tracking-caption text-text-base">{item.title}</p>
                    <p className="mt-1 text-xs leading-6 text-text-secondary">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="surface-elevated rounded-[20px] p-6 sm:p-8">
            <div className="mb-7 flex rounded-[12px] bg-[rgba(255,255,255,0.025)] p-1 gap-1" role="tablist">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 py-2.5 text-sm font-[510] tracking-caption rounded-[10px] transition-all duration-200',
                  mode === m
                    ? 'bg-bg-active text-text-base border border-border shadow-[0_1px_0_rgba(255,255,255,0.04)]'
                    : 'text-text-secondary hover:text-text-base',
                )}
              >
                {m === 'login' ? 'Войти' : 'Регистрация'}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">
              {mode === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт'}
            </h1>
            <p className="mt-2 text-[15px] leading-7 text-text-secondary">
              {mode === 'login'
                ? 'Введите email и пароль для входа в Barnamaj'
                : 'Выберите тип аккаунта и заполните данные'}
            </p>
            {mode === 'login' && (
              <p className="mt-2 text-xs text-text-faint">
                Вход для администраторов:{' '}
                <Link href="/admin-auth" className="text-[#b5b3ff] hover:text-accent-bright">
                  отдельная admin-страница
                </Link>
              </p>
            )}
          </div>

          <AuthForm mode={mode} acct={acct} onAcctChange={setAcct} />

          <p className="mt-5 text-center text-sm text-text-secondary">
            {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-[510] text-[#b5b3ff] transition-colors hover:text-accent-bright"
            >
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
          </section>
        </div>
      </main>
    </div>
  )
}

