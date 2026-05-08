'use client'

import { motion } from 'framer-motion'
import { Settings, Bell, Shield, Trash2, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { useAuth } from '@/context/AuthContext'
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
      // TODO (Неделя 1): реализовать через PATCH /api/auth/password
      // Требует текущий пароль + новый пароль
      setPwdMsg({ ok: false, text: 'Изменение пароля будет доступно в следующем обновлении' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка'
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
      // TODO (Неделя 1): реализовать через DELETE /api/users/me
      await signOut()
      router.push('/')
    } catch {
      alert('Не удалось удалить аккаунт. Попробуйте позже.')
    } finally {
      setDeleting(false)
    }
  }

  const notificationItems = useMemo(() => [
    { label: 'Email-уведомления о новых заказах', key: 'email-orders' },
    { label: 'Уведомления о сообщениях', key: 'email-messages' },
    { label: 'Обновления платформы', key: 'platform-updates' },
  ], [])

  return (
    <motion.div
      className="space-y-6 max-w-2xl"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(73,71,171,0.18)] bg-[linear-gradient(180deg,rgba(99,138,212,0.12),rgba(73,71,171,0.08))]">
          <Settings className="w-5 h-5 text-[#c7ccff]" />
        </div>
        <div>
          <div className="chip chip-accent mb-2">Workspace Controls</div>
          <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">Настройки</h1>
          <p className="text-[15px] text-text-secondary">Управление аккаунтом</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Bell, title: 'Notifications', text: 'Каналы связи и частота уведомлений.' },
          { icon: Shield, title: 'Security', text: 'Пароль и контроль доступа к аккаунту.' },
          { icon: Trash2, title: 'Lifecycle', text: 'Удаление аккаунта и финальные действия.' },
        ].map(item => {
          const Icon = item.icon
          return (
            <div key={item.title} className="rounded-[14px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-bg-panel">
                <Icon className="h-4 w-4 text-[#bfd1ff]" />
              </div>
              <p className="text-[13px] font-[510] tracking-caption text-text-base">{item.title}</p>
              <p className="mt-1 text-xs leading-6 text-text-secondary">{item.text}</p>
            </div>
          )
        })}
      </div>

      {/* Notifications */}
      <div className="rounded-[16px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 space-y-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-text-secondary" />
          <h2 className="text-[13px] font-[510] tracking-caption text-text-base">Уведомления</h2>
        </div>
        {notificationItems.map(({ label, key }) => (
          <label key={key} className="group flex items-center justify-between rounded-[12px] border border-border bg-bg-card px-4 py-3 transition-colors hover:bg-bg-elevated">
            <div className="pr-4">
              <span className="block text-sm text-text-secondary transition-colors group-hover:text-text-base">{label}</span>
              <span className="mt-1 block text-xs text-text-faint">Push-state сохраняется локально в браузере</span>
            </div>
            <input
              type="checkbox"
              checked={notifPrefs[key] ?? true}
              onChange={() => toggleNotif(key)}
              className="h-4 w-4 cursor-pointer accent-violet-600"
            />
          </label>
        ))}
      </div>

      {/* Security — password change */}
      <div className="rounded-[16px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 space-y-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-text-secondary" />
          <h2 className="text-[13px] font-[510] tracking-caption text-text-base">Безопасность</h2>
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
          <p className={`rounded-[10px] border px-3 py-2 text-sm ${pwdMsg.ok ? 'border-[rgba(72,152,188,0.24)] bg-[rgba(72,152,188,0.08)] text-[#a8e0ef]' : 'border-red-500/25 bg-red-500/10 text-red-300'}`}>{pwdMsg.text}</p>
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
      <div className="rounded-[16px] border border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.10),rgba(127,29,29,0.05))] p-6 space-y-3 shadow-[0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-400" />
          <h2 className="text-[13px] font-[510] tracking-caption text-red-300">Опасная зона</h2>
        </div>
        <p className="text-sm leading-6 text-text-secondary">
          Удаление аккаунта <strong className="text-red-400">{user?.email}</strong> необратимо.
          Все данные будут утеряны.
        </p>
        {!showDeleteConfirm ? (
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="mr-1.5 h-4 w-4" />Удалить аккаунт
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
              <ChevronRight className="mr-1.5 h-4 w-4 rotate-180" />Отмена
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
