'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { api, SpecialtyGrantDto, RoleGrantDto } from '@/lib/api'
import { Shield, Plus, Trash2, ChevronLeft, Clock, Crown } from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────────

const SPECIALTY_OPTIONS = ['KycReviewer', 'FinanceManager', 'ContentModerator', 'SupportAgent', 'TechOps', 'Auditor']
const SPECIALTY_LABELS: Record<string, string> = {
  KycReviewer: 'KYC-ревьюер', FinanceManager: 'Финансовый менеджер',
  ContentModerator: 'Контент-модератор', SupportAgent: 'Агент поддержки',
  TechOps: 'ТехОпс', Auditor: 'Аудитор',
}

const ROLE_OPTIONS = ['Moderator', 'SeniorAdmin', 'HeadAdmin']
const ROLE_LABELS: Record<string, string> = {
  Moderator: 'Модератор', SeniorAdmin: 'Ст. администратор', HeadAdmin: 'Гл. администратор',
}
const ROLE_COLORS: Record<string, string> = {
  Moderator: 'text-sky-400', SeniorAdmin: 'text-amber-400', HeadAdmin: 'text-red-400',
}

function formatDate(iso: string | null) {
  if (!iso) return 'бессрочно'
  return new Date(iso).toLocaleDateString('ru-KZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

type Tab = 'specialties' | 'roles'

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage() {
  const { isAtLeast } = useAuth()
  const params  = useParams()
  const router  = useRouter()
  const userId  = params.id as string
  const canManage = isAtLeast('HeadAdmin')

  const [tab, setTab] = useState<Tab>('specialties')

  // ── Specialties state ──────────────────────────────────────────────────
  const [grants,    setGrants]    = useState<SpecialtyGrantDto[]>([])
  const [sLoading,  setSLoading]  = useState(false)
  const [sError,    setSError]    = useState<string | null>(null)
  const [showSForm, setShowSForm] = useState(false)
  const [specialty, setSpecialty] = useState(SPECIALTY_OPTIONS[0])
  const [sExpires,  setSExpires]  = useState('')
  const [sNote,     setSNote]     = useState('')
  const [sGranting, setSGranting] = useState(false)
  const [sGrantErr, setSGrantErr] = useState<string | null>(null)

  // ── Role grants state ──────────────────────────────────────────────────
  const [roleGrants,     setRoleGrants]     = useState<RoleGrantDto[]>([])
  const [rLoading,       setRLoading]       = useState(false)
  const [rError,         setRError]         = useState<string | null>(null)
  const [effectiveRole,  setEffectiveRole]  = useState<string | null>(null)
  const [showRForm,      setShowRForm]      = useState(false)
  const [grantedRole,    setGrantedRole]    = useState(ROLE_OPTIONS[0])
  const [rExpires,       setRExpires]       = useState('')
  const [rReason,        setRReason]        = useState('')
  const [rGranting,      setRGranting]      = useState(false)
  const [rGrantErr,      setRGrantErr]      = useState<string | null>(null)

  // ── Loaders ────────────────────────────────────────────────────────────

  const loadSpecialties = useCallback(async () => {
    if (!userId) return
    setSLoading(true); setSError(null)
    try { setGrants(await api.adminSpecialties.getForUser(userId)) }
    catch (e: unknown) { setSError(e instanceof Error ? e.message : 'Ошибка') }
    finally { setSLoading(false) }
  }, [userId])

  const loadRoles = useCallback(async () => {
    if (!userId) return
    setRLoading(true); setRError(null)
    try {
      const [g, eff] = await Promise.all([
        api.adminRoleGrants.getForUser(userId),
        api.adminRoleGrants.getEffectiveRole(userId),
      ])
      setRoleGrants(g); setEffectiveRole(eff.role)
    } catch (e: unknown) { setRError(e instanceof Error ? e.message : 'Ошибка') }
    finally { setRLoading(false) }
  }, [userId])

  useEffect(() => { loadSpecialties() }, [loadSpecialties])
  useEffect(() => { if (tab === 'roles') loadRoles() }, [tab, loadRoles])

  // ── Specialty handlers ─────────────────────────────────────────────────

  const handleGrantSpecialty = async () => {
    setSGranting(true); setSGrantErr(null)
    try {
      await api.adminSpecialties.grant(userId, {
        specialty, expiresAt: sExpires ? new Date(sExpires).toISOString() : null, note: sNote || null,
      })
      setShowSForm(false); setSpecialty(SPECIALTY_OPTIONS[0]); setSExpires(''); setSNote('')
      await loadSpecialties()
    } catch (e: unknown) { setSGrantErr(e instanceof Error ? e.message : 'Ошибка') }
    finally { setSGranting(false) }
  }

  const handleRevokeSpecialty = async (s: string) => {
    if (!confirm(`Отозвать специализацию ${SPECIALTY_LABELS[s] ?? s}?`)) return
    try { await api.adminSpecialties.revoke(userId, s); await loadSpecialties() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Ошибка') }
  }

  // ── Role grant handlers ────────────────────────────────────────────────

  const handleGrantRole = async () => {
    setRGranting(true); setRGrantErr(null)
    try {
      await api.adminRoleGrants.grant(userId, {
        grantedRole, expiresAt: rExpires ? new Date(rExpires).toISOString() : null, reason: rReason || null,
      })
      setShowRForm(false); setGrantedRole(ROLE_OPTIONS[0]); setRExpires(''); setRReason('')
      await loadRoles()
    } catch (e: unknown) { setRGrantErr(e instanceof Error ? e.message : 'Ошибка') }
    finally { setRGranting(false) }
  }

  const handleRevokeRole = async (grantId: string, role: string) => {
    if (!confirm(`Отозвать грант роли ${ROLE_LABELS[role] ?? role}?`)) return
    try { await api.adminRoleGrants.revoke(grantId); await loadRoles() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Ошибка') }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-base transition-colors">
        <ChevronLeft className="w-4 h-4" /> Назад
      </button>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-violet-500/15"><Shield className="w-5 h-5 text-violet-400" /></div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Управление доступом</h1>
          <p className="text-sm text-text-muted font-mono">{userId}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-subtle">
        {(['specialties', 'roles'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-violet-500 text-text-base' : 'border-transparent text-text-muted hover:text-text-base'
            }`}>
            {t === 'specialties' ? 'Специализации' : 'Временные роли'}
          </button>
        ))}
      </div>

      {/* ── SPECIALTIES ─────────────────────────────────────── */}
      {tab === 'specialties' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canManage && (
              <button onClick={() => setShowSForm(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors">
                <Plus className="w-4 h-4" /> Выдать
              </button>
            )}
          </div>

          {showSForm && canManage && (
            <div className="rounded-xl border border-border-subtle bg-surface-card p-4 space-y-3">
              <h3 className="font-semibold text-text-base">Выдать специализацию</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-text-muted">Специализация</label>
                  <select value={specialty} onChange={e => setSpecialty(e.target.value)}
                    className="w-full bg-surface-hover border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base">
                    {SPECIALTY_OPTIONS.map(s => <option key={s} value={s}>{SPECIALTY_LABELS[s]}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-muted">Срок действия</label>
                  <input type="date" value={sExpires} onChange={e => setSExpires(e.target.value)}
                    className="w-full bg-surface-hover border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-muted">Примечание</label>
                  <input type="text" value={sNote} onChange={e => setSNote(e.target.value)} placeholder="Причина..."
                    className="w-full bg-surface-hover border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base" />
                </div>
              </div>
              {sGrantErr && <p className="text-sm text-red-400">{sGrantErr}</p>}
              <div className="flex gap-2">
                <button onClick={handleGrantSpecialty} disabled={sGranting}
                  className="px-4 py-1.5 text-sm rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-colors">
                  {sGranting ? 'Сохранение...' : 'Выдать'}
                </button>
                <button onClick={() => setShowSForm(false)}
                  className="px-4 py-1.5 text-sm rounded-lg border border-border-subtle text-text-muted hover:text-text-base transition-colors">
                  Отмена
                </button>
              </div>
            </div>
          )}

          {sError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{sError}</div>}

          {sLoading ? (
            <div className="text-center py-8 text-text-muted text-sm">Загрузка...</div>
          ) : grants.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">Специализации не выданы</div>
          ) : (
            <div className="rounded-xl border border-border-subtle bg-surface-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-hover">
                    <th className="text-left px-4 py-3 text-text-muted font-medium">Специализация</th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">Статус</th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Срок</span>
                    </th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">Примечание</th>
                    {canManage && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {grants.map(g => (
                    <tr key={g.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-base">{SPECIALTY_LABELS[g.specialty] ?? g.specialty}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${g.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-500/15 text-text-muted'}`}>
                          {g.isActive ? 'Активна' : 'Истекла'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{formatDate(g.expiresAt)}</td>
                      <td className="px-4 py-3 text-text-muted">{g.note ?? '—'}</td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <button onClick={() => handleRevokeSpecialty(g.specialty)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ROLES ───────────────────────────────────────────── */}
      {tab === 'roles' && (
        <div className="space-y-4">
          {effectiveRole && (
            <div className="flex items-center gap-2 text-sm">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-text-muted">Эффективная роль:</span>
              <span className={`font-semibold ${ROLE_COLORS[effectiveRole] ?? 'text-text-base'}`}>
                {ROLE_LABELS[effectiveRole] ?? effectiveRole}
              </span>
            </div>
          )}

          <div className="flex justify-end">
            {canManage && (
              <button onClick={() => setShowRForm(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors">
                <Plus className="w-4 h-4" /> Выдать роль
              </button>
            )}
          </div>

          {showRForm && canManage && (
            <div className="rounded-xl border border-border-subtle bg-surface-card p-4 space-y-3">
              <h3 className="font-semibold text-text-base">Выдать временную роль</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-text-muted">Роль</label>
                  <select value={grantedRole} onChange={e => setGrantedRole(e.target.value)}
                    className="w-full bg-surface-hover border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base">
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-muted">Срок действия</label>
                  <input type="date" value={rExpires} onChange={e => setRExpires(e.target.value)}
                    className="w-full bg-surface-hover border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-muted">Причина</label>
                  <input type="text" value={rReason} onChange={e => setRReason(e.target.value)} placeholder="Обоснование..."
                    className="w-full bg-surface-hover border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base" />
                </div>
              </div>
              {rGrantErr && <p className="text-sm text-red-400">{rGrantErr}</p>}
              <div className="flex gap-2">
                <button onClick={handleGrantRole} disabled={rGranting}
                  className="px-4 py-1.5 text-sm rounded-lg bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 transition-colors">
                  {rGranting ? 'Сохранение...' : 'Выдать'}
                </button>
                <button onClick={() => setShowRForm(false)}
                  className="px-4 py-1.5 text-sm rounded-lg border border-border-subtle text-text-muted hover:text-text-base transition-colors">
                  Отмена
                </button>
              </div>
            </div>
          )}

          {rError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{rError}</div>}

          {rLoading ? (
            <div className="text-center py-8 text-text-muted text-sm">Загрузка...</div>
          ) : roleGrants.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">Временные роли не выданы</div>
          ) : (
            <div className="rounded-xl border border-border-subtle bg-surface-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-hover">
                    <th className="text-left px-4 py-3 text-text-muted font-medium">Роль</th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">Статус</th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Срок</span>
                    </th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">Причина</th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">Выдан</th>
                    {canManage && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {roleGrants.map(g => (
                    <tr key={g.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-hover/50 transition-colors">
                      <td className={`px-4 py-3 font-semibold ${ROLE_COLORS[g.grantedRole] ?? 'text-text-base'}`}>
                        {ROLE_LABELS[g.grantedRole] ?? g.grantedRole}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          g.isRevoked ? 'bg-neutral-500/15 text-text-muted' :
                          g.isActive  ? 'bg-emerald-500/15 text-emerald-400' :
                                        'bg-neutral-500/15 text-text-muted'
                        }`}>
                          {g.isRevoked ? 'Отозван' : g.isActive ? 'Активен' : 'Истёк'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{formatDate(g.expiresAt)}</td>
                      <td className="px-4 py-3 text-text-muted">{g.reason ?? '—'}</td>
                      <td className="px-4 py-3 text-text-muted">{new Date(g.createdAt).toLocaleDateString('ru-KZ')}</td>
                      {canManage && (
                        <td className="px-4 py-3">
                          {!g.isRevoked && (
                            <button onClick={() => handleRevokeRole(g.id, g.grantedRole)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
