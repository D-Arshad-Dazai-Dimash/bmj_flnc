'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'register'
type AccountType = 'Client' | 'Developer'

const ACCOUNT_TYPE_MAP: Record<AccountType, 1 | 2> = {
  Developer: 1,
  Client: 2,
}

interface AuthModalProps {
  isOpen: boolean
  initialMode?: AuthMode
  initialAccountType?: AccountType
  onClose: () => void
  onSuccess?: (token: string) => void
}

function InputField({
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-400">{label}</label>
      <div className="relative">
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full px-3.5 py-2.5 text-sm rounded-lg bg-white/5 border text-white placeholder:text-zinc-600',
            'transition-all duration-200 focus:outline-none focus:ring-1',
            error
              ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
              : 'border-white/10 hover:border-white/20 focus:border-violet-500/60 focus:ring-violet-500/20'
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  )
}

export default function AuthModal({
  isOpen,
  initialMode = 'login',
  initialAccountType = 'Developer',
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [accountType, setAccountType] = useState<AccountType>(initialAccountType)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  // Sync with external prop changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setAccountType(initialAccountType)
      setError(null)
      setFieldErrors({})
      setSuccess(false)
      setEmail('')
      setPassword('')
      setName('')
    }
  }, [isOpen, initialMode, initialAccountType])

  const handleLogin = async () => {
    const errors: Record<string, string> = {}
    if (!email) errors.email = 'Введите email'
    if (!password) errors.password = 'Введите пароль'
    if (Object.keys(errors).length) { setFieldErrors(errors); return }

    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const response = await api.auth.login({ email, password })
      localStorage.setItem('barnamaj_token', response.accessToken)
      setSuccess(true)
      setTimeout(() => {
        onSuccess?.(response.accessToken)
        onClose()
      }, 1000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    const errors: Record<string, string> = {}
    if (!name) errors.name = 'Введите имя'
    if (!email) errors.email = 'Введите email'
    if (!password) errors.password = 'Введите пароль'
    else if (password.length < 6) errors.password = 'Минимум 6 символов'
    if (Object.keys(errors).length) { setFieldErrors(errors); return }

    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const response = await api.auth.register({
        name,
        email,
        password,
        accountType: ACCOUNT_TYPE_MAP[accountType],
      })
      localStorage.setItem('barnamaj_token', response.accessToken)
      setSuccess(true)
      setTimeout(() => {
        onSuccess?.(response.accessToken)
        onClose()
      }, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') handleLogin()
    else handleRegister()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              transition={{ type: 'spring', duration: 0.35 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {mode === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {mode === 'login' ? 'Barnamaj — платформа для IT-команд' : 'Присоединяйтесь к Barnamaj'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex px-6 pt-4 gap-1">
                {(['login', 'register'] as AuthMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(null); setFieldErrors({}) }}
                    className={cn(
                      'flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                      mode === m
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {m === 'login' ? 'Войти' : 'Регистрация'}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                {success ? (
                  <motion.div
                    className="flex flex-col items-center gap-3 py-8"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-400" />
                    <p className="text-white font-medium">
                      {mode === 'login' ? 'Добро пожаловать!' : 'Аккаунт создан!'}
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {/* Account type selector (register only) */}
                    {mode === 'register' && (
                      <div className="flex gap-2">
                        {(['Developer', 'Client'] as AccountType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setAccountType(t)}
                            className={cn(
                              'flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200',
                              accountType === t
                                ? t === 'Developer'
                                  ? 'bg-violet-600/20 border-violet-500/60 text-violet-300'
                                  : 'bg-cyan-600/20 border-cyan-500/60 text-cyan-300'
                                : 'border-white/10 text-zinc-500 hover:text-white hover:border-white/20'
                            )}
                          >
                            {t === 'Developer' ? '👨‍💻 Разработчик' : '💼 Заказчик'}
                          </button>
                        ))}
                      </div>
                    )}

                    {mode === 'register' && (
                      <InputField
                        label="Имя"
                        value={name}
                        onChange={setName}
                        error={fieldErrors.name}
                        placeholder="Ваше имя"
                      />
                    )}

                    <InputField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      error={fieldErrors.email}
                      placeholder="you@example.com"
                    />

                    <InputField
                      label="Пароль"
                      type="password"
                      value={password}
                      onChange={setPassword}
                      error={fieldErrors.password}
                      placeholder="••••••••"
                    />

                    {error && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
                    </button>

                    <p className="text-center text-xs text-zinc-600">
                      {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
                      <button
                        type="button"
                        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
                        className="text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                      </button>
                    </p>
                  </>
                )}
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
