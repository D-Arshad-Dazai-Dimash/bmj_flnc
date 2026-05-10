'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ShieldCheck,
  Users,
  Pin,
  PinOff,
  Pencil,
  Check,
  X,
  Briefcase,
  Wrench,
  Star,
  MessageSquare,
  Trash2,
  Send,
  Layers,
  StickyNote,
  MessageCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'

import {
  api,
  type ProfileSummaryDto,
  type RatingSummaryDto,
  type ProfileProjectDto,
} from '@/lib/api'
import { RatingBadge } from '@/components/reviews/RatingBadge'
import { ReviewsList } from '@/components/reviews/ReviewsList'
import { COVER_PRESETS, coverBg } from '@/lib/coverPresets'
import { formatTenge } from '@/lib/pricing'
import { avatarSrc } from '@/lib/avatar'
import { useAuth } from '@/context/AuthContext'
import LocaleLink from '@/components/ui/LocaleLink'
import { BackButton } from '@/components/ui/back-button'
import { Tooltip } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import {
  addProfilePost,
  deleteProfilePost,
  getProfilePosts,
  type ProfilePost,
} from '@/lib/socialStore'

type Tab = 'works' | 'posts' | 'reviews'

/**
 * Публичная страница профиля в Instagram-like компактном стиле:
 *   – обложка + аватар (аватар вылетает поверх обложки, не перекрывается)
 *   – компактная плотная сетка работ → клик переходит в детали заказа
 *   – пользовательские «посты» (локальное MVP-хранилище)
 *   – статистика по ролям только при ≥3 работах
 *   – дефолтный «5★» если отзывов ещё нет
 *   – кнопка «Назад» в шапке
 */
export default function PublicProfilePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { user } = useAuth()

  const [profile, setProfile] = useState<ProfileSummaryDto | null>(null)
  const [summary, setSummary] = useState<RatingSummaryDto | null>(null)
  const [projects, setProjects] = useState<ProfileProjectDto[]>([])
  const [posts, setPosts] = useState<ProfilePost[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<Tab>('works')

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

  useEffect(() => {
    reload()
  }, [reload])

  // подтянуть локальные посты
  useEffect(() => {
    if (!id) return
    setPosts(getProfilePosts(id))
  }, [id])

  if (loading) {
    return <ProfileSkeleton />
  }
  if (error || !profile) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <BackButton fallbackHref="/profiles" />
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-6 text-sm text-red-300">
          {error ?? 'Профиль недоступен'}
        </div>
      </div>
    )
  }

  const pinnedIds = new Set(profile.pinnedProjectIds ?? [])
  const pinned = projects.filter((p) => pinnedIds.has(p.id))
  pinned.sort(
    (a, b) => [...pinnedIds].indexOf(a.id) - [...pinnedIds].indexOf(b.id),
  )
  const others = projects.filter((p) => !pinnedIds.has(p.id))
  const completedCount = projects.filter((p) => p.status === 'Completed').length
  const inProgressCount = projects.filter((p) => p.status !== 'Completed').length
  const asClientCount = projects.filter((p) => p.isClient).length
  const asExecutorCount = projects.filter((p) => p.isExecutor).length

  // показываем расширенную статистику только при ≥3 работах
  const showStats = projects.length >= 3

  async function handleTogglePin(projectId: string) {
    if (!profile) return
    // optimistic
    const prev = profile.pinnedProjectIds ?? []
    const next = prev.includes(projectId)
      ? prev.filter((x) => x !== projectId)
      : [...prev, projectId]
    setProfile({ ...profile, pinnedProjectIds: next })
    try {
      const newPins = await api.profiles.togglePin(profile.id, projectId)
      setProfile((cur) => (cur ? { ...cur, pinnedProjectIds: newPins } : cur))
    } catch (e) {
      // откат
      setProfile((cur) => (cur ? { ...cur, pinnedProjectIds: prev } : cur))
      alert(e instanceof Error ? e.message : 'Не удалось изменить закрепление')
    }
  }

  function handleAddPost(text: string) {
    if (!profile || !user?.id) return
    const post = addProfilePost(profile.id, user.id, text)
    setPosts((prev) => [post, ...prev])
  }

  function handleDeletePost(postId: string) {
    if (!profile) return
    deleteProfilePost(profile.id, postId)
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  return (
    <div className="mx-auto max-w-3xl px-3 pb-12 sm:px-4">
      {/* шапка с кнопкой назад */}
      <div className="flex items-center justify-between py-3">
        <BackButton fallbackHref="/profiles" />
        {isOwner && (
          <LocaleLink
            href="/dashboard/settings"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-bg-card px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-white/20 hover:bg-bg-hover hover:text-text-base"
          >
            <Pencil className="h-3.5 w-3.5" />
            Редактировать
          </LocaleLink>
        )}
      </div>

      {/* Обложка + аватар поверх */}
      <div className="relative">
        <div
          className="h-32 w-full rounded-xl sm:h-40"
          style={{ background: coverBg(profile.coverPresetId) }}
        />
        <div className="relative z-10 -mt-10 flex items-end gap-3 px-1 sm:-mt-12 sm:gap-4 sm:px-2">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-bg-base bg-bg-elevated shadow-lg sm:h-24 sm:w-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc(profile.logoUrl)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>

          {/* быстрые цифры справа от аватара (компактно) */}
          <div className="mb-1 flex flex-1 items-center gap-4 pb-1 sm:gap-6">
            <CompactStat value={projects.length} label="публикации" />
            <CompactStat
              value={summary?.ratingsCount ?? 0}
              label="отзывов"
            />
            <CompactStat value={completedCount} label="выполнено" />
          </div>
        </div>
      </div>

      {/* Имя + бейджи + рейтинг */}
      <header className="mt-3 px-1 sm:px-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight text-text-base sm:text-2xl">
            {profile.name}
          </h1>
          {profile.isVerified && (
            <Tooltip label="Верифицирован">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                <ShieldCheck className="h-3 w-3" />
              </span>
            </Tooltip>
          )}
          <DefaultRating summary={summary} profileId={profile.id} />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span>{accountTypeLabel(profile.accountType)}</span>
          {profile.memberCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {profile.memberCount}
            </span>
          )}
          <span>
            с {new Date(profile.createdAt).toLocaleDateString('ru')}
          </span>
          {profile.status && (
            <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent-light">
              {profile.status}
            </span>
          )}
        </div>

        {profile.bio && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {profile.bio}
          </p>
        )}
      </header>

      {/* Расширенная статистика (только при ≥3 работах) */}
      {showStats && (
        <section className="mt-5 grid grid-cols-2 gap-2 px-1 sm:grid-cols-4 sm:px-2">
          <StatCard
            icon={<Briefcase className="h-3.5 w-3.5" />}
            label="как заказчик"
            value={asClientCount}
          />
          <StatCard
            icon={<Wrench className="h-3.5 w-3.5" />}
            label="как исполнитель"
            value={asExecutorCount}
          />
          <StatCard
            icon={<Check className="h-3.5 w-3.5" />}
            label="завершено"
            value={completedCount}
            tone="emerald"
          />
          <StatCard
            icon={<Layers className="h-3.5 w-3.5" />}
            label="в работе"
            value={inProgressCount}
            tone="sky"
          />
        </section>
      )}

      {/* Распределение оценок (если есть отзывы) */}
      {summary && summary.ratingsCount > 0 && (
        <section className="mt-5 rounded-xl border border-border bg-bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-base">
              <Star className="h-3.5 w-3.5 text-amber-300" /> Оценки
            </h2>
            <div className="text-xs text-text-muted">
              {summary.avgRating?.toFixed(2)} · {summary.ratingsCount}
            </div>
          </div>
          <div className="space-y-1">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const count = summary.breakdown[String(n)] ?? 0
              const pct =
                summary.ratingsCount > 0 ? (count / summary.ratingsCount) * 100 : 0
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-text-muted">{n}</span>
                  <Star className="h-2.5 w-2.5 text-amber-300/70" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded bg-bg-elevated">
                    <div
                      className="h-full bg-amber-300/70 transition-[width] duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-7 text-right text-text-muted">{count}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Закреплённые работы — всегда сверху, маленькая лента */}
      {pinned.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
            <Pin className="h-3 w-3" /> Закреплённые
          </h2>
          <ProjectsGrid
            items={pinned}
            canPin={isOwner}
            onTogglePin={handleTogglePin}
          />
        </section>
      )}

      {/* Табы: работы / посты / отзывы (Instagram-like) */}
      <nav className="mt-6 flex border-y border-border">
        <TabButton
          active={tab === 'works'}
          onClick={() => setTab('works')}
          icon={<Layers className="h-3.5 w-3.5" />}
          label="Работы"
          count={projects.length}
        />
        <TabButton
          active={tab === 'posts'}
          onClick={() => setTab('posts')}
          icon={<StickyNote className="h-3.5 w-3.5" />}
          label="Посты"
          count={posts.length}
        />
        <TabButton
          active={tab === 'reviews'}
          onClick={() => setTab('reviews')}
          icon={<MessageCircle className="h-3.5 w-3.5" />}
          label="Отзывы"
          count={summary?.ratingsCount ?? 0}
        />
      </nav>

      <div className="mt-4">
        {tab === 'works' && (
          <>
            {others.length === 0 && pinned.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-5 w-5" />}
                title="Здесь пока нет работ"
                hint={
                  isOwner
                    ? 'Создайте первый проект, и он появится в ленте.'
                    : 'Пользователь ещё не публиковал работ.'
                }
              />
            ) : (
              <ProjectsGrid
                items={others}
                canPin={isOwner}
                onTogglePin={handleTogglePin}
              />
            )}
          </>
        )}

        {tab === 'posts' && (
          <PostsTab
            posts={posts}
            isOwner={isOwner}
            onAdd={handleAddPost}
            onDelete={handleDeletePost}
          />
        )}

        {tab === 'reviews' && (
          <div className="space-y-3">
            <ReviewsList profileId={profile.id} pageSize={10} />
          </div>
        )}
      </div>

      {editing && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={(p) => {
            setProfile(p)
            setEditing(false)
          }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Маленькие компоненты

function CompactStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-base font-semibold text-text-base sm:text-lg">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-text-faint">{label}</p>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone?: 'emerald' | 'sky'
}) {
  const valueCls =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'sky'
        ? 'text-sky-300'
        : 'text-text-base'
  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-faint">
        {icon}
        {label}
      </div>
      <p className={`mt-0.5 text-lg font-semibold ${valueCls}`}>{value}</p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-t-2 px-2 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors ${
        active
          ? 'border-text-base text-text-base'
          : 'border-transparent text-text-faint hover:text-text-secondary'
      }`}
    >
      {icon}
      {label}
      {count != null && count > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
            active
              ? 'bg-bg-elevated text-text-secondary'
              : 'bg-bg-card text-text-faint'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-bg-card/40 p-10 text-center">
      <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg-elevated text-text-muted">
        {icon}
      </div>
      <p className="text-sm font-medium text-text-base">{title}</p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
    </div>
  )
}

function DefaultRating({
  summary,
  profileId,
}: {
  summary: RatingSummaryDto | null
  profileId: string
}) {
  if (summary && summary.ratingsCount > 0) {
    return <RatingBadge profileId={profileId} initialSummary={summary} size="sm" />
  }
  // дефолтные 5★ + подсказка
  return (
    <Tooltip label="Отзывов пока нет">
      <span className="inline-flex items-center gap-0.5 rounded-md border border-border bg-bg-card px-1.5 py-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className="h-3 w-3 fill-amber-300/40 text-amber-300/40"
          />
        ))}
        <span className="ml-1 text-[10px] text-text-faint">нет отзывов</span>
      </span>
    </Tooltip>
  )
}

function accountTypeLabel(t: string): string {
  if (t === 'Individual') return 'Частный профиль'
  if (t === 'Company') return 'Компания'
  if (t === 'Clan') return 'Команда'
  return t
}

// ──────────────────────────────────────────────────────────────────────
// Сетка работ (компактная Instagram-like). Карточки кликабельны → детали заказа.

function ProjectsGrid({
  items,
  canPin,
  onTogglePin,
}: {
  items: ProfileProjectDto[]
  canPin: boolean
  onTogglePin: (id: string) => void
}) {
  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((p) => (
        <ProjectTile
          key={p.id}
          project={p}
          canPin={canPin}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  )
}

function ProjectTile({
  project: p,
  canPin,
  onTogglePin,
}: {
  project: ProfileProjectDto
  canPin: boolean
  onTogglePin: (id: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="relative"
    >
      <LocaleLink
        href={`/dashboard/orders/${p.id}`}
        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-bg-card transition-all duration-150 hover:border-white/20 hover:bg-bg-elevated"
      >
        <div
          className="h-12 w-full opacity-80 transition-opacity group-hover:opacity-100"
          style={{
            background: coverBg((p.title.charCodeAt(0) + p.title.length) % 10),
          }}
        />
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          <p className="line-clamp-2 min-h-[2.4em] text-[13px] font-medium leading-snug text-text-base">
            {p.title}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <StatusPill status={p.status} />
            {p.isClient && (
              <span title="Вы заказчик"><Briefcase className="h-3 w-3 text-text-faint" /></span>
            )}
            {p.isExecutor && (
              <span title="Вы исполнитель"><Wrench className="h-3 w-3 text-text-faint" /></span>
            )}
          </div>
          <p className="mt-auto text-[11px] font-medium text-text-secondary">
            {p.budget != null ? `${formatTenge(p.budget)} ₸` : ' '}
          </p>
        </div>
      </LocaleLink>
      {canPin && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onTogglePin(p.id)
          }}
          title={p.isPinned ? 'Открепить' : 'Закрепить'}
          className={`absolute right-1.5 top-1.5 cursor-pointer rounded-md border p-1 backdrop-blur transition ${
            p.isPinned
              ? 'border-amber-500/50 bg-amber-500/20 text-amber-200'
              : 'border-white/20 bg-black/40 text-white opacity-0 group-hover:opacity-100'
          }`}
        >
          {p.isPinned ? (
            <PinOff className="h-3 w-3" />
          ) : (
            <Pin className="h-3 w-3" />
          )}
        </button>
      )}
    </motion.div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    Open: { cls: 'border-blue-500/20 bg-blue-500/[0.06] text-blue-300', label: 'open' },
    InProgress: {
      cls: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-300',
      label: 'wip',
    },
    Review: { cls: 'border-violet-500/20 bg-violet-500/[0.06] text-violet-300', label: 'review' },
    Completed: {
      cls: 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300',
      label: 'done',
    },
    Cancelled: {
      cls: 'border-rose-500/20 bg-rose-500/[0.06] text-rose-300',
      label: 'cancel',
    },
  }
  const { cls, label } = map[status] ?? {
    cls: 'border-border bg-bg-elevated text-text-muted',
    label: status.toLowerCase(),
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Посты профиля (локальные, MVP)

function PostsTab({
  posts,
  isOwner,
  onAdd,
  onDelete,
}: {
  posts: ProfilePost[]
  isOwner: boolean
  onAdd: (text: string) => void
  onDelete: (id: string) => void
}) {
  const [text, setText] = useState('')

  return (
    <div className="space-y-3">
      {isOwner && (
        <div className="rounded-xl border border-border bg-bg-card p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Поделитесь чем-нибудь о проделанной работе или о себе…"
            className="w-full resize-none rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-base placeholder:text-text-faint focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/10"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-text-faint">
              {text.length}/500 · сохраняется в этом браузере
            </span>
            <button
              onClick={() => {
                if (!text.trim()) return
                onAdd(text)
                setText('')
              }}
              disabled={!text.trim()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3 w-3" />
              Опубликовать
            </button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" />}
          title="Здесь пока нет постов"
          hint={
            isOwner
              ? 'Расскажите о завершённой работе, опыте или подходе к задачам.'
              : 'Пользователь ещё ничего не публиковал.'
          }
        />
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <article
              key={p.id}
              className="group rounded-xl border border-border bg-bg-card p-4"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] text-text-faint">
                  {new Date(p.createdAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {isOwner && (
                  <Tooltip label="Удалить пост">
                    <button
                      onClick={() => onDelete(p.id)}
                      className="cursor-pointer rounded p-1 text-text-faint opacity-0 transition hover:bg-bg-hover hover:text-rose-300 group-hover:opacity-100"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-base">
                {p.text}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Skeleton

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 pb-12 sm:px-4">
      <div className="py-3">
        <Skeleton className="h-7 w-20" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl sm:h-40" />
      <div className="-mt-10 flex items-end gap-3 sm:-mt-12">
        <Skeleton className="h-20 w-20 rounded-full sm:h-24 sm:w-24" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Edit modal

function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: ProfileSummaryDto
  onClose: () => void
  onSaved: (p: ProfileSummaryDto) => void
}) {
  const [name, setName] = useState(profile.name)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [status, setStatus] = useState(profile.status ?? '')
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl ?? '')
  const [cover, setCover] = useState<number>(profile.coverPresetId ?? 0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      const updated = await api.profiles.updateSocial(profile.id, {
        name,
        bio,
        status,
        logoUrl,
        coverPresetId: cover,
      })
      onSaved(updated)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-text-base">
            Редактирование профиля
          </p>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-text-faint hover:bg-bg-hover hover:text-text-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div>
            <p className="mb-2 text-xs font-medium text-text-muted">Обложка</p>
            <div className="grid grid-cols-5 gap-2">
              {COVER_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCover(p.id)}
                  title={p.label}
                  className={`h-12 cursor-pointer rounded-lg border-2 transition ${
                    cover === p.id
                      ? 'border-accent shadow-[0_0_0_3px_rgba(255,255,255,0.05)]'
                      : 'border-transparent'
                  }`}
                  style={{ background: p.bg }}
                >
                  {cover === p.id && (
                    <Check className="mx-auto h-4 w-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Field label="Имя">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={256}
              className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-text-base focus:border-accent/60 focus:outline-none"
            />
          </Field>

          <Field label="Статус (короткий)" hint={`${status.length}/80`}>
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value.slice(0, 80))}
              placeholder="Открыт к новым проектам"
              className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-text-base focus:border-accent/60 focus:outline-none"
            />
          </Field>

          <Field label="Аватар (URL)">
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-text-base focus:border-accent/60 focus:outline-none"
            />
          </Field>

          <Field label="О себе" hint={`${bio.length}/2000`}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 2000))}
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-text-base focus:border-accent/60 focus:outline-none"
            />
          </Field>

          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-border bg-bg-base px-4 py-2 text-sm text-text-muted hover:bg-bg-hover hover:text-text-base"
          >
            Отмена
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
          >
            {busy ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        {hint && <span className="text-[10px] text-text-faint">{hint}</span>}
      </div>
      {children}
    </label>
  )
}
