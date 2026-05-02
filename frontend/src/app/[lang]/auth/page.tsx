'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import Image from 'next/image'
import Link from '@/components/ui/LocaleLink'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, toBackendAccountType } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

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
      <span className="text-xs font-medium tracking-wide text-text-muted">Тип аккаунта</span>
      <div className="grid grid-cols-2 gap-2">
        {(['Developer', 'Client'] as Acct[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-pressed={value === t}
            className={cn(
              'py-3 px-4 rounded-lg text-sm border transition-all duration-200 text-left',
              value === t
                ? t === 'Developer'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                  : 'border-accent/50 bg-accent/10 text-accent-light'
                : 'border-border text-text-muted hover:border-border-bright hover:text-text-base',
            )}
          >
            <span className="text-base mr-1.5">{t === 'Developer' ? '👨‍💻' : '💼'}</span>
            <span className="font-medium">
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
        })
      }
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 900)
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
            className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm overflow-hidden"
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
            className="flex items-center gap-2.5 p-3 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-sm"
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

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      <div
        className="fixed inset-0 bg-grid-pattern bg-grid pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse 70% 70% at 50% 30%, black 10%, transparent 80%)' }}
      />
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-text-muted hover:text-text-base transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Barnamaj</span>
        </Link>
        <div className="relative w-7 h-7">
          <Image
            src="/logo.png"
            alt="Barnamaj"
            fill
            sizes="28px"
            className="object-contain drop-shadow-[0_0_6px_rgba(124,58,237,0.6)]"
          />
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-md rounded-2xl p-8"
          style={{
            background: 'rgba(12, 12, 18, 0.85)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 80px rgba(124,58,237,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex rounded-xl bg-bg-base p-1 gap-1 mb-7" role="tablist">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                  mode === m
                    ? 'bg-bg-hover text-text-base shadow-sm'
                    : 'text-text-muted hover:text-text-base',
                )}
              >
                {m === 'login' ? 'Войти' : 'Регистрация'}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-bold text-text-base">
              {mode === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт'}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {mode === 'login'
                ? 'Введите email и пароль для входа в Barnamaj'
                : 'Выберите тип аккаунта и заполните данные'}
            </p>
          </div>

          <AuthForm mode={mode} acct={acct} onAcctChange={setAcct} />

          <p className="text-center text-sm text-text-muted mt-5">
            {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-accent-light hover:text-accent-bright transition-colors font-medium"
            >
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}

