'use client'

import { motion } from 'framer-motion'
import { Settings, Bell, Shield, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const router   = useLocaleRouter()

  // ── Password change ──
  const [curPwd,  setCurPwd]  = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [cfmPwd,  setCfmPwd]  = useState('')
  const [pwdMsg,  setPwdMsg]  = useState<{ ok: boolean; text: string } | null>(null)
  const [pwdSaving, setPwdSaving] = useState(false)

  const handlePasswordChange = async () => {
    setPwdMsg(null)
    if (!newPwd || newPwd.length < 8) {
      setPwdMsg({ ok: false, text: 'Минимум 8 символов' })
      return
    }
    if (newPwd !== cfmPwd) {
      setPwdMsg({ ok: false, text: 'Пароли не совпадают' })
      return
    }
    setPwdSaving(true)
    try {
      await api.auth.changePassword({ currentPassword: curPwd, newPassword: newPwd })
      setPwdMsg({ ok: true, text: 'Пароль обновлён' })
      setCurPwd(''); setNewPwd(''); setCfmPwd('')
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message
                     : err instanceof Error   ? err.message
                     : 'Ошибка'
      setPwdMsg({ ok: false, text: message })
    } finally {
      setPwdSaving(false)
    }
  }

  // ── Notifications (local state, persisted to localStorage) ──
  const NOTIF_KEY = 'barnamaj_notif_prefs'
  const getPrefs = (): Record<string, boolean> => {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? '{}')
    } catch { return {} }
  }
  const [notifPrefs, setNotifPrefs] = useState(getPrefs)

  const toggleNotif = (key: string) => {
    setNotifPrefs(prev => {
      const next = { ...prev, [key]: !(prev[key] ?? true) }
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next))
      return next
    })
  }

  // ── Delete account ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.users.deleteMe()
      await signOut()
      router.push('/')
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message
                     : err instanceof Error   ? err.message
                     : 'Не удалось удалить аккаунт. Попробуйте позже.'
      alert(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <motion.div
      className="space-y-6 max-w-2xl"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-accent/15">
          <Settings className="w-5 h-5 text-accent-light" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Настройки</h1>
          <p className="text-sm text-text-muted">Управление аккаунтом</p>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-border bg-bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-semibold text-text-base">Уведомления</h2>
        </div>
        {[
          { label: 'Email-уведомления о новых заказах', key: 'email-orders' },
          { label: 'Уведомления о сообщениях',        key: 'email-messages' },
          { label: 'Обновления платформы',             key: 'platform-updates' },
        ].map(({ label, key }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm text-text-muted group-hover:text-text-base transition-colors">{label}</span>
            <input
              type="checkbox"
              checked={notifPrefs[key] ?? true}
              onChange={() => toggleNotif(key)}
              className="accent-violet-600 w-4 h-4 cursor-pointer"
            />
          </label>
        ))}
      </div>

      {/* Security — password change */}
      <div className="rounded-xl border border-border bg-bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-semibold text-text-base">Безопасность</h2>
        </div>
        <Input
          label="Текущий пароль"
          type="password"
          value={curPwd}
          onChange={e => setCurPwd(e.target.value)}
          placeholder="••••••••"
        />
        <Input
          label="Новый пароль"
          type="password"
          value={newPwd}
          onChange={e => setNewPwd(e.target.value)}
          placeholder="Минимум 8 символов"
        />
        <Input
          label="Подтвердить"
          type="password"
          value={cfmPwd}
          onChange={e => setCfmPwd(e.target.value)}
          placeholder="••••••••"
        />
        {pwdMsg && (
          <p className={`text-sm ${pwdMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{pwdMsg.text}</p>
        )}
        <Button
          variant="outline"
          size="md"
          loading={pwdSaving}
          onClick={handlePasswordChange}
        >
          Сменить пароль
        </Button>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-semibold text-red-400">Опасная зона</h2>
        </div>
        <p className="text-xs text-text-muted">
          Удаление аккаунта <strong className="text-red-400">{user?.email}</strong> необратимо.
          Все данные будут утеряны.
        </p>
        {!showDeleteConfirm ? (
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            Удалить аккаунт
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              size="sm"
              loading={deleting}
              onClick={handleDelete}
            >
              Подтвердить удаление
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Отмена
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
