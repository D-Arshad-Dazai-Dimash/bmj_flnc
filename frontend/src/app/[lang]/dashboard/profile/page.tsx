'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { motion } from 'framer-motion'
import { User, Save, Camera, Hexagon, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { KycPanel } from '@/components/kyc/KycPanel'

const ROLE_LABELS: Record<string, string> = {
  owner:     'Владелец',
  leader:    'Лидер',
  admin:     'Админ',
  architect: 'Архитектор',
  member:    'Участник',
}

export default function ProfilePage() {
  const { user, updateProfile, updateUser } = useAuth()

  const [fullName,  setFullName]  = useState(user?.profileName ?? '')
  const [bio,       setBio]       = useState(user?.bio ?? '')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [errMsg,    setErrMsg]    = useState<string | null>(null)

  // clan info not available via current API — placeholder
  const clanName: string | null = null
  const clanRole: string | null = null

  // Sync fields when user loads
  useEffect(() => {
    if (user) {
      setFullName(user.profileName ?? '')
      setBio(user.bio ?? '')
    }
  }, [user?.id])

  const handleSave = async () => {
    setSaving(true)
    setErrMsg(null)
    try {
      await updateProfile({ full_name: fullName, bio })
      // Also sync the legacy user object
      updateUser({ profileName: fullName, bio })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка сохранения'
      setErrMsg(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      className="space-y-6 max-w-2xl"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(73,71,171,0.18)] bg-[linear-gradient(180deg,rgba(99,138,212,0.12),rgba(73,71,171,0.08))]">
          <User className="w-5 h-5 text-[#b8c7ff]" />
        </div>
        <div>
          <div className="chip chip-accent mb-2">Identity</div>
          <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">Профиль</h1>
          <p className="text-[15px] text-text-secondary">Управление личными данными</p>
        </div>
      </div>

      {/* Avatar block */}
      <div className="rounded-[16px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 shadow-[0_1px_0_rgba(255,255,255,0.03)] flex items-center gap-5">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-[rgba(99,138,212,0.20)] bg-[linear-gradient(180deg,rgba(99,138,212,0.16),rgba(73,71,171,0.14))] text-2xl font-semibold text-[#dfe6ff] shadow-[0_18px_36px_rgba(5,8,48,0.22)]">
            {user?.profileName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <button
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg-panel transition-colors hover:bg-bg-elevated"
            title="Загрузка аватара пока недоступна"
          >
            <Camera className="w-3 h-3 text-[#dfe6ff]" />
          </button>
        </div>
        <div>
          <p className="text-[18px] font-semibold tracking-h3 text-text-base">{user?.profileName}</p>
          <p className="text-sm text-text-secondary">{user?.email}</p>
          <span className="chip mt-2 border-[rgba(99,138,212,0.26)] bg-[rgba(99,138,212,0.08)] text-[#cdd8ff]">
            <Sparkles className="h-3 w-3" />
            {user?.accountType === 'Developer' ? 'Разработчик' : 'Заказчик'}
          </span>
        </div>
      </div>

      {/* Clan Badge */}
      {clanName && (
        <div className="relative flex items-center gap-4 overflow-hidden rounded-[16px] border border-[rgba(72,152,188,0.20)] bg-[linear-gradient(180deg,rgba(72,152,188,0.08),rgba(73,71,171,0.06))] p-5">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          <div className="rounded-[12px] border border-[rgba(72,152,188,0.22)] bg-bg-panel p-2.5">
            <Hexagon className="w-5 h-5 text-[#9fdcec]" />
          </div>
          <div>
            <p className="mb-0.5 text-xs text-text-faint">Клан</p>
            <p className="font-semibold text-text-base">{clanName}</p>
            {clanRole && (
              <span className="text-xs text-[#9fdcec]">{ROLE_LABELS[clanRole]}</span>
            )}
          </div>
        </div>
      )}

      {/* Edit form */}
      <div className="rounded-[16px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 space-y-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <h2 className="text-[13px] font-[510] tracking-caption text-text-base">Основная информация</h2>

        <Input
          label="Отображаемое имя"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Имя Фамилия"
        />
        <Input
          label="Bio"
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Коротко о себе..."
        />
        <Input
          label="Email"
          type="email"
          value={user?.email ?? ''}
          onChange={() => {}}
          disabled
          placeholder="email@example.com"
        />
        <Input
          label="Роль"
          value={user?.accountType === 'Developer' ? 'Разработчик' : 'Заказчик'}
          onChange={() => {}}
          disabled
        />

        {errMsg && (
          <p className="rounded-[10px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{errMsg}</p>
        )}

        <div className="pt-2">
          <Button
            variant="default"
            size="md"
            loading={saving}
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            {saved ? <><span>✓</span> Сохранено</> : <><Save className="w-4 h-4" /> Сохранить</>}
          </Button>
        </div>
      </div>

      {/* KYC панель — верификация личности (рынок РК) */}
      <KycPanel />
    </motion.div>
  )
}
