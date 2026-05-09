'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ShieldCheck, Users, Pin, PinOff, Pencil, Check, X,
  Briefcase, Wrench, Star,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type ProfileSummaryDto, type RatingSummaryDto, type ProfileProjectDto } from '@/lib/api'
import { RatingBadge } from '@/components/reviews/RatingBadge'
import { ReviewsList } from '@/components/reviews/ReviewsList'
import { COVER_PRESETS, coverBg } from '@/lib/coverPresets'
import { useAuth } from '@/context/AuthContext'
import { formatTenge } from '@/lib/pricing'

/**
 * Публичная страница профиля в стиле «соцсети»:
 *   • градиент-обложка (10 пресетов) + аватар, имя, статус, рейтинг
 *   • био
 *   • лента проектов как «посты» (закреплённые сверху, остальные ниже)
 *   • для владельца — режим редактирования + закрепление/открепление
 */
export default function PublicProfilePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { user } = useAuth()

  const [profile,  setProfile]  = useState<ProfileSummaryDto | null>(null)
  const [summary,  setSummary]  = useState<RatingSummaryDto  | null>(null)
  const [projects, setProjects] = useState<ProfileProjectDto[]>([])
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)

  const isOwner = !!(user?.profileId && profile?.id === user.profileId)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [p, s, list] = await Promise.all([
        api.profiles.get(id).catch(() => null),
        api.reviews.summary(id).catch(() => null),
        api.profiles.projects(id, 1, 24).catch(() => [] as ProfileProjectDto[]),
      ])
      if (!p) setError('Профиль не найден')
      setProfile(p)
      setSummary(s)
      setProjects(list)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  if (loading)            return <div className="p-8 text-text-muted">Загрузка…</div>
  if (error || !profile)  return <div className="p-8 text-red-300">{error ?? 'Профиль недоступен'}</div>

  const pinnedIds = new Set(profile.pinnedProjectIds ?? [])
  const pinned    = projects.filter(p => pinnedIds.has(p.id))
  // Сохраняем порядок из pinnedProjectIds
  pinned.sort((a, b) =>
    [...pinnedIds].indexOf(a.id) - [...pinnedIds].indexOf(b.id))
  const others = projects.filter(p => !pinnedIds.has(p.id))

  async function handleTogglePin(projectId: string) {
    if (!profile) return
    try {
      const newPins = await api.profiles.togglePin(profile.id, projectId)
      setProfile({ ...profile, pinnedProjectIds: newPins })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось изменить закрепление')
    }
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      {/* ── Обложка ─────────────────────────────────────── */}
      <div className="relative">
        <div
          className="h-44 sm:h-56 w-full"
          style={{ background: coverBg(profile.coverPresetId) }}
        />
        {isOwner && (
          <button
            onClick={() => setEditing(true)}
            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-black/40"
          >
            <Pencil className="h-3.5 w-3.5" /> Редактировать
          </button>
        )}
      </div>

      {/* ── Хедер: аватар + мета ───────────────────────── */}
      <header className="px-6">
        <div className="-mt-12 flex flex-wrap items-end gap-4">
          <div className="rounded-2xl border-4 border-bg-base bg-bg-elevated overflow-hidden h-24 w-24 flex items-center justify-center shrink-0">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-semibold text-text-muted">
                {profile.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-12">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-text-base truncate">{profile.name}</h1>
              {profile.isVerified && (
                <span title="Верифицирован" className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                  <ShieldCheck className="h-3 w-3" /> Верифицирован
                </span>
              )}
              <RatingBadge profileId={profile.id} initialSummary={summary} size="md" />
            </div>

            <div className="mt-1 flex items-center gap-3 text-xs text-text-muted flex-wrap">
              <span>{profile.accountType}</span>
              {profile.memberCount > 0 && (
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {profile.memberCount}</span>
              )}
              <span>с {new Date(profile.createdAt).toLocaleDateString('ru')}</span>
              {profile.status && (
                <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent-light">
                  {profile.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm text-text-secondary whitespace-pre-wrap">{profile.bio}</p>
        )}
      </header>

      {/* ── Распределение оценок ───────────────────────── */}
      {summary && summary.ratingsCount > 0 && (
        <section className="mt-6 mx-6 rounded-xl border border-border bg-bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-base inline-flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-300" /> Оценки
            </h2>
            <div className="text-sm text-text-muted">
              {summary.avgRating?.toFixed(2)} · {summary.ratingsCount} отзывов
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {([5, 4, 3, 2, 1] as const).map(n => {
              const count = summary.breakdown[String(n)] ?? 0
              const pct   = summary.ratingsCount > 0 ? (count / summary.ratingsCount) * 100 : 0
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-text-muted">{n}★</span>
                  <div className="flex-1 h-2 rounded bg-bg-elevated overflow-hidden">
                    <div className="h-full bg-amber-300/70" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-text-muted">{count}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Закреплённые ───────────────────────────────── */}
      {pinned.length > 0 && (
        <section className="mt-8 px-6">
          <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wider inline-flex items-center gap-1.5">
            <Pin className="h-3.5 w-3.5" /> Закреплённые
          </h2>
          <ProjectsGrid items={pinned} canPin={isOwner} onTogglePin={handleTogglePin} />
        </section>
      )}

      {/* ── Все проекты ────────────────────────────────── */}
      <section className="mt-8 px-6">
        <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wider">
          {pinned.length > 0 ? 'Все проекты' : 'Проекты'}
        </h2>
        {others.length === 0 && pinned.length === 0 ? (
          <p className="text-sm text-text-muted">Здесь пока ничего нет.</p>
        ) : (
          <ProjectsGrid items={others} canPin={isOwner} onTogglePin={handleTogglePin} />
        )}
      </section>

      {/* ── Отзывы ─────────────────────────────────────── */}
      <section className="mt-10 px-6">
        <h2 className="mb-3 text-base font-semibold text-text-base">Отзывы</h2>
        <ReviewsList profileId={profile.id} pageSize={10} />
      </section>

      {/* ── Edit drawer ────────────────────────────────── */}
      {editing && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={(p) => { setProfile(p); setEditing(false) }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Сетка карточек проектов (Instagram-like)

function ProjectsGrid({
  items, canPin, onTogglePin,
}: {
  items:       ProfileProjectDto[]
  canPin:      boolean
  onTogglePin: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(p => (
        <motion.article
          key={p.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="group relative rounded-xl border border-border bg-bg-card overflow-hidden hover:border-accent/40 transition-colors"
        >
          <div
            className="h-20 w-full opacity-80"
            style={{ background: coverBg((p.title.charCodeAt(0) + p.title.length) % 10) }}
          />
          <div className="p-3 space-y-1.5">
            <p className="text-sm font-medium text-text-base line-clamp-2 leading-snug">
              {p.title}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <StatusPill status={p.status} />
              {p.isClient    && <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> заказчик</span>}
              {p.isExecutor  && <span className="inline-flex items-center gap-1"><Wrench   className="h-3 w-3" /> исполнитель</span>}
            </div>
            {p.budget != null && (
              <p className="text-xs text-text-secondary">{formatTenge(p.budget)} ₸</p>
            )}
          </div>
          {canPin && (
            <button
              onClick={() => onTogglePin(p.id)}
              title={p.isPinned ? 'Открепить' : 'Закрепить'}
              className={`absolute top-2 right-2 rounded-md border p-1.5 backdrop-blur transition ${
                p.isPinned
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                  : 'bg-black/40 border-white/20 text-white opacity-0 group-hover:opacity-100'
              }`}
            >
              {p.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
          )}
        </motion.article>
      ))}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Open:        'border-blue-500/40 bg-blue-500/10 text-blue-300',
    InProgress:  'border-amber-500/40 bg-amber-500/10 text-amber-300',
    Review:      'border-violet-500/40 bg-violet-500/10 text-violet-300',
    Completed:   'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    Cancelled:   'border-rose-500/40 bg-rose-500/10 text-rose-300',
  }
  const cls = map[status] ?? 'border-border bg-bg-elevated text-text-muted'
  return <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] ${cls}`}>{status}</span>
}

// ──────────────────────────────────────────────────────────────────────────────
// Edit modal: cover / status / bio / name / logoUrl

function EditProfileModal({
  profile, onClose, onSaved,
}: {
  profile: ProfileSummaryDto
  onClose: () => void
  onSaved: (p: ProfileSummaryDto) => void
}) {
  const [name,    setName]    = useState(profile.name)
  const [bio,     setBio]     = useState(profile.bio ?? '')
  const [status,  setStatus]  = useState(profile.status ?? '')
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl ?? '')
  const [cover,   setCover]   = useState<number>(profile.coverPresetId ?? 0)
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  async function save() {
    setBusy(true); setErr(null)
    try {
      const updated = await api.profiles.updateSocial(profile.id, {
        name, bio, status, logoUrl, coverPresetId: cover,
      })
      onSaved(updated)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-bg-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-text-base">Редактирование профиля</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-faint hover:text-text-muted hover:bg-bg-hover">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Cover preset */}
          <div>
            <p className="text-xs font-medium text-text-muted mb-2">Обложка</p>
            <div className="grid grid-cols-5 gap-2">
              {COVER_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCover(p.id)}
                  title={p.label}
                  className={`h-12 rounded-lg border-2 transition ${
                    cover === p.id ? 'border-accent shadow-[0_0_0_3px_rgba(255,255,255,0.05)]' : 'border-transparent'
                  }`}
                  style={{ background: p.bg }}
                >
                  {cover === p.id && <Check className="h-4 w-4 text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          <Field label="Имя">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={256}
              className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-base focus:outline-none focus:border-accent/60"
            />
          </Field>

          <Field label="Статус (короткий)" hint={`${status.length}/80`}>
            <input
              value={status}
              onChange={e => setStatus(e.target.value.slice(0, 80))}
              placeholder="Открыт к новым проектам"
              className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-base focus:outline-none focus:border-accent/60"
            />
          </Field>

          <Field label="Аватар (URL)">
            <input
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-base focus:outline-none focus:border-accent/60"
            />
          </Field>

          <Field label="О себе" hint={`${bio.length}/2000`}>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 2000))}
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-base focus:outline-none focus:border-accent/60"
            />
          </Field>

          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm text-text-muted hover:text-text-base hover:bg-bg-hover"
          >
            Отмена
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {busy ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        {hint && <span className="text-[10px] text-text-faint">{hint}</span>}
      </div>
      {children}
    </label>
  )
}
