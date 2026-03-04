'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { User, Save, Camera, Hexagon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ClanRole } from '@/lib/database.types'

const ROLE_LABELS: Record<ClanRole, string> = {
  leader:    'Лидер',
  architect: 'Архитектор',
  member:    'Участник',
}

export default function ProfilePage() {
  const { user, profile, updateProfile, updateUser } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [fullName,  setFullName]  = useState(profile?.full_name ?? user?.profileName ?? '')
  const [bio,       setBio]       = useState(profile?.bio ?? user?.bio ?? '')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [errMsg,    setErrMsg]    = useState<string | null>(null)

  const [clanName, setClanName] = useState<string | null>(null)
  const [clanRole, setClanRole] = useState<ClanRole | null>(null)

  useEffect(() => {
    if (!user) return
    async function fetchClan() {
      const { data } = await supabase
        .from('clan_members')
        .select('role, clan:clans(name)')
        .eq('user_id', user!.id)
        .limit(1)
        .single()
      if (data) {
        setClanName((data.clan as any)?.name ?? null)
        setClanRole(data.role as ClanRole)
      }
    }
    fetchClan().catch(() => {})
  }, [user, supabase])

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
        <div className="p-2 rounded-xl bg-accent/15">
          <User className="w-5 h-5 text-accent-light" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Профиль</h1>
          <p className="text-sm text-text-muted">Управление личными данными</p>
        </div>
      </div>

      {/* Avatar block */}
      <div className="rounded-xl border border-border bg-bg-card p-6 flex items-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center text-2xl font-bold text-accent-light">
            {user?.profileName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <button
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center hover:bg-accent-light transition-colors"
            title="Загрузка аватара пока недоступна"
          >
            <Camera className="w-3 h-3 text-white" />
          </button>
        </div>
        <div>
          <p className="font-semibold text-text-base">{user?.profileName}</p>
          <p className="text-sm text-text-muted">{user?.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs border border-accent/30 text-accent-light bg-accent/10">
            {user?.accountType === 'Developer' ? '👨‍💻 Разработчик' : '💼 Заказчик'}
          </span>
        </div>
      </div>

      {/* Clan Badge */}
      {clanName && (
        <div className="relative rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex items-center gap-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Hexagon className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-text-faint mb-0.5">Клан</p>
            <p className="font-semibold text-text-base">{clanName}</p>
            {clanRole && (
              <span className="text-xs text-emerald-400">{ROLE_LABELS[clanRole]}</span>
            )}
          </div>
        </div>
      )}

      {/* Edit form */}
      <div className="rounded-xl border border-border bg-bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-base">Основная информация</h2>

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
          <p className="text-sm text-red-400">{errMsg}</p>
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
    </motion.div>
  )
}
