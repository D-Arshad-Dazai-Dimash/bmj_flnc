'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import Image from 'next/image'
import Link from '@/components/ui/LocaleLink'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, ApiError, toBackendAccountType } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'
type Acct = 'Developer' | 'Client'

// ── Password input with show/hide ─────────────────────────────────────────────
function PasswordInput({
  label = 'Пароль',
  value,
  onChange,
  error,
  placeholder = '••••••••',
  id,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
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
      autoComplete="current-password"
      suffix={
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="text-text-muted hover:text-text-base transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
    />
  )
}

// ── Account type selector ─────────────────────────────────────────────────────
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
            className={cn(
              'py-3 px-4 rounded-lg text-sm border transition-all duration-200 text-left',
              value === t
                ? t === 'Developer'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                  : 'border-accent/50 bg-accent/10 text-accent-light'
                : 'border-border text-text-muted hover:border-border-bright hover:text-text-base'
            )}
          >
            <span className="text-base mr-1.5">{t === 'Developer' ? '👨‍💻' : '💼'}</span>
            <span className="font-medium">{t === 'Developer' ? 'Разработчик' : 'Заказчик'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────
interface AuthFormProps {
  mode: Mode
  acct: Acct
  onModeChange: (m: Mode) => void
  onAcctChange: (a: Acct) => void
}

function AuthForm({ mode, acct, onModeChange, onAcctChange }: AuthFormProps) {
  const router  = useLocaleRouter()
  const { login, register } = useAuth()

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errMsg,  setErrMsg]  = useState<string | null>(null)

  // fields
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({})

  // reset fields when mode changes
  useEffect(() => {
    setErrMsg(null)
    setFieldErr({})
    setSuccess(false)
    setName('')
    setEmail('')
    setPassword('')
  }, [mode])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (mode === 'register' && !name.trim()) errs.name = 'Введите имя'
    if (!email.trim()) errs.email = 'Введите email'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Некорректный email'
    if (!password) errs.password = 'Введите пароль'
    else if (mode === 'register' && password.length < 6) errs.password = 'Минимум 6 символов'
    setFieldErr(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrMsg(null)

    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register({
          email,
          password,
          name: name.trim() || email.split('@')[0],
          accountType: toBackendAccountType(acct),
        })
      }
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1200)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrMsg(err.message)
      } else {
        setErrMsg('Что-то пошло не так')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

        {/* Account type (register only) */}
        {mode === 'register' && (
          <AccountTypeSelector value={acct} onChange={onAcctChange} />
        )}

        {/* Name (register only) */}
        {mode === 'register' && (
          <Input
            label="Ваше имя"
            placeholder="Имя Фамилия"
            value={name}
            onChange={e => setName(e.target.value)}
            error={fieldErr.name}
            autoComplete="name"
            autoFocus
          />
        )}

        {/* Email */}
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={fieldErr.email}
          autoComplete="email"
          autoFocus={mode === 'login'}
        />

        {/* Password */}
        <PasswordInput
          value={password}
          onChange={setPassword}
          error={fieldErr.password}
          placeholder={mode === 'register' ? 'Минимум 6 символов' : '••••••••'}
        />

        {/* Forgot password link */}
        {mode === 'login' && (
          <div className="text-right -mt-1">
            <a href="#" className="text-xs text-text-muted hover:text-accent-light transition-colors">
              Забыли пароль?
            </a>
          </div>
        )}

        {/* Error alert */}
        <AnimatePresence>
          {errMsg && !success && (
            <motion.div
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

        {/* Success */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2.5 p-3 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {mode === 'login' ? 'Добро пожаловать!' : 'Аккаунт создан! Перенаправляем...'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
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
            : 'Создать аккаунт'}
        </Button>
      </form>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [acct, setAcct] = useState<Acct>('Developer')

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Background grid */}
      <div
        className="fixed inset-0 bg-grid-pattern bg-grid pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse 70% 70% at 50% 30%, black 10%, transparent 80%)' }}
      />

      {/* Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-text-muted hover:text-text-base transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Barnamaj</span>
        </Link>
        <div className="relative w-7 h-7">
          <Image src="/logo.png" alt="Barnamaj" fill sizes="28px" className="object-contain drop-shadow-[0_0_6px_rgba(124,58,237,0.6)]" />
        </div>
      </header>

      {/* Main */}
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
          {/* Mode tabs */}
          <div className="flex rounded-xl bg-bg-base p-1 gap-1 mb-7">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                  mode === m
                    ? 'bg-bg-hover text-text-base shadow-sm'
                    : 'text-text-muted hover:text-text-base'
                )}
              >
                {m === 'login' ? 'Войти' : 'Регистрация'}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-text-base">
              {mode === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт'}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {mode === 'login'
                ? 'Введите данные для входа в Barnamaj'
                : 'Присоединяйтесь к элитной сети разработчиков'}
            </p>
          </div>

          {/* Form */}
          <Suspense fallback={null}>
            <AuthForm
              mode={mode}
              acct={acct}
              onModeChange={setMode}
              onAcctChange={setAcct}
            />
          </Suspense>

          {/* Switch mode link */}
          <p className="text-center text-sm text-text-muted mt-5">
            {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <button
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
