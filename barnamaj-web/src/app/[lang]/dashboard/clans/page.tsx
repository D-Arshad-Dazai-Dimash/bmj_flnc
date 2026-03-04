'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
  Users, Plus, Shield, LogOut, Mail, X, Crown, Hexagon,
} from 'lucide-react'
import type { ClanRole, ClanWithMembers } from '@/lib/database.types'

// ── Role badge ─────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<ClanRole, string> = {
  leader:    'Лидер',
  architect: 'Архитектор',
  member:    'Участник',
}
const ROLE_COLORS: Record<ClanRole, string> = {
  leader:    'border-amber-500/40 text-amber-400 bg-amber-500/10',
  architect: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
  member:    'border-border text-text-muted bg-bg-base',
}

function RoleBadge({ role }: { role: ClanRole }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[role]}`}>
      {role === 'leader' && <Crown className="w-3 h-3" />}
      {ROLE_LABELS[role]}
    </span>
  )
}

// ── Invite modal ───────────────────────────────────────────────────────────────
function InviteModal({
  clanId,
  onClose,
}: {
  clanId: string
  onClose: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [email,    setEmail]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [result,   setResult]   = useState<string | null>(null)
  const [errMsg,   setErrMsg]   = useState<string | null>(null)

  async function handleInvite() {
    if (!email.trim()) return
    setSending(true)
    setResult(null)
    setErrMsg(null)
    try {
      await supabase.rpc('invite_to_clan', { p_clan_id: clanId, p_email: email.trim() })
      setResult(`Пользователь ${email.trim()} добавлен в клан.`)
      setEmail('')
    } catch (e: unknown) {
      setErrMsg((e as Error)?.message ?? 'Ошибка при приглашении')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent-light" /> Пригласить участника
          </h3>
          <button onClick={onClose} className="p-1 text-text-faint hover:text-text-base transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full px-3 py-2 rounded-xl border border-border bg-bg-surface text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
          />
          {result && <p className="text-xs text-emerald-400">{result}</p>}
          {errMsg && <p className="text-xs text-red-400">{errMsg}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-bg-hover transition-colors">
            Закрыть
          </button>
          <button
            disabled={!email.trim() || sending}
            onClick={handleInvite}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
          >
            {sending
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Mail className="w-4 h-4" />
            }
            Пригласить
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ClansPage() {
  const { user }  = useAuth()
  const supabase  = useMemo(() => createClient(), [])

  const [tab,          setTab]          = useState<'mine' | 'create'>('mine')
  const [clans,        setClans]        = useState<ClanWithMembers[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadErr,      setLoadErr]      = useState<string | null>(null)
  const [inviteClanId, setInviteClanId] = useState<string | null>(null)

  // Create-clan form
  const [clanName, setClanName] = useState('')
  const [clanDesc, setClanDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)

  const fetchClans = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setLoadErr(null)
    try {
      const { data, error } = await supabase
        .from('clan_members')
        .select(`
          role,
          clan:clans(
            id, name, description, avatar_url, leader_id, created_at,
            members:clan_members(
              user_id, role,
              profile:profiles(id, full_name, avatar_url, role)
            )
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        if (error.code === '42P01') {
          setLoadErr('Таблица кланов не создана — нужно применить миграцию 009_clans.sql в Supabase')
        } else {
          setLoadErr(error.message)
        }
        return
      }

      const items: ClanWithMembers[] = (data ?? []).map((row: any) => {
        const clan = row.clan
        return {
          ...clan,
          member_count: clan.members?.length ?? 0,
          my_role:      row.role as ClanRole,
          members:      clan.members ?? [],
        }
      })
      setClans(items)
    } catch (e: unknown) {
      setLoadErr(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => { fetchClans() }, [fetchClans])

  const handleCreate = useCallback(async () => {
    if (!user || !clanName.trim()) return
    setCreating(true)
    setCreateErr(null)
    try {
      // Insert clan
      const { data: clan, error } = await supabase
        .from('clans')
        .insert({ name: clanName.trim(), description: clanDesc.trim() || null, leader_id: user.id })
        .select('id')
        .single()
      if (error) {
        // Человекочитаемое сообщение для частых ошибок
        if (error.code === '23505') throw new Error('Клан с таким названием уже существует')
        if (error.code === '42501') throw new Error('Нет прав: убедитесь, что вы авторизованы')
        if (error.code === '42P01') throw new Error('Таблица кланов не создана — примените миграцию 009_clans.sql')
        throw new Error(error.message || error.details || 'Ошибка базы данных')
      }

      // Auto-add leader as member
      const { error: memberError } = await supabase
        .from('clan_members')
        .insert({ clan_id: clan.id, user_id: user.id, role: 'leader' })
      if (memberError) throw new Error(memberError.message)

      setClanName('')
      setClanDesc('')
      setTab('mine')
      await fetchClans()
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setCreating(false)
    }
  }, [user, supabase, clanName, clanDesc, fetchClans])

  const handleLeave = useCallback(async (clanId: string) => {
    if (!user) return
    await supabase
      .from('clan_members')
      .delete()
      .eq('clan_id', clanId)
      .eq('user_id', user.id)
    setClans(prev => prev.filter(c => c.id !== clanId))
  }, [user, supabase])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-accent/15">
          <Hexagon className="w-5 h-5 text-accent-light" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Кланы</h1>
          <p className="text-sm text-text-muted">Верифицированные команды разработчиков</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-bg-surface border border-border w-fit">
        {(['mine', 'create'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-muted hover:text-text-base'
            }`}
          >
            {t === 'mine' ? 'Мои кланы' : 'Создать клан'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── My Clans Tab ── */}
        {tab === 'mine' && (
          <motion.div
            key="mine"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : loadErr ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400 space-y-2">
                <p className="font-medium">Не удалось загрузить кланы</p>
                <p className="text-xs opacity-80">{loadErr}</p>
              </div>
            ) : clans.length === 0 ? (
              <div className="rounded-2xl border border-border bg-bg-card p-12 flex flex-col items-center gap-3 text-center">
                <Users className="w-10 h-10 text-text-faint" />
                <p className="text-text-muted">Вы не состоите ни в одном клане</p>
                <p className="text-xs text-text-faint max-w-xs">
                  Кланы — это верифицированные команды разработчиков. Вступите или создайте свой.
                </p>
                <button
                  onClick={() => setTab('create')}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Создать клан
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {clans.map(clan => (
                  <div key={clan.id} className="relative rounded-2xl border border-border bg-bg-card p-5 space-y-3 overflow-hidden">
                    {/* Kazakh ornament accent */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Hexagon className="w-4 h-4 text-accent-light flex-shrink-0" />
                          <h3 className="font-semibold text-text-base">{clan.name}</h3>
                          <RoleBadge role={clan.my_role!} />
                        </div>
                        {clan.description && (
                          <p className="text-sm text-text-muted line-clamp-2">{clan.description}</p>
                        )}
                        <p className="text-xs text-text-faint flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {clan.member_count} {clan.member_count === 1 ? 'участник' : 'участников'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        {clan.my_role === 'leader' && (
                          <button
                            onClick={() => setInviteClanId(clan.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:border-accent/40 hover:text-accent-light transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" /> Пригласить
                          </button>
                        )}
                        {clan.my_role !== 'leader' && (
                          <button
                            onClick={() => handleLeave(clan.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Выйти
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Members preview */}
                    {clan.members.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {clan.members.slice(0, 6).map(m => (
                          <div
                            key={m.user_id}
                            title={m.profile?.full_name ?? ''}
                            className="w-7 h-7 rounded-full bg-accent/20 border border-border flex items-center justify-center text-xs font-medium text-accent-light uppercase"
                          >
                            {(m.profile?.full_name?.[0] ?? '?')}
                          </div>
                        ))}
                        {clan.members.length > 6 && (
                          <div className="w-7 h-7 rounded-full bg-bg-hover border border-border flex items-center justify-center text-xs text-text-faint">
                            +{clan.members.length - 6}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Create Clan Tab ── */}
        {tab === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative rounded-2xl border border-border bg-bg-card p-6 space-y-5 overflow-hidden max-w-lg">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent-light" />
                <h2 className="font-semibold text-text-base">Создать новый клан</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-muted block mb-1">Название клана *</label>
                  <input
                    value={clanName}
                    onChange={e => setClanName(e.target.value)}
                    maxLength={50}
                    placeholder="Название (2–50 символов)"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-bg-surface text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Описание (необязательно)</label>
                  <textarea
                    value={clanDesc}
                    onChange={e => setClanDesc(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Чем занимается ваш клан?"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-bg-surface text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 resize-none"
                  />
                </div>
                {createErr && <p className="text-xs text-red-400">{createErr}</p>}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setTab('mine')}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-bg-hover transition-colors"
                >
                  Отмена
                </button>
                <button
                  disabled={clanName.trim().length < 2 || creating}
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
                >
                  {creating
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Plus className="w-4 h-4" />
                  }
                  Создать
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite modal */}
      {inviteClanId && (
        <InviteModal
          clanId={inviteClanId}
          onClose={() => setInviteClanId(null)}
        />
      )}
    </motion.div>
  )
}
