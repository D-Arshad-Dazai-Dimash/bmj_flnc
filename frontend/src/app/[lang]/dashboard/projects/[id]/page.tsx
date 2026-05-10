'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  Pencil,
  Star,
  User as UserIcon,
  XCircle,
  MessageSquare,
} from 'lucide-react'
import {
  api,
  ApiError,
  type ProjectDetailDto,
  type ReviewDto,
} from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatTenge } from '@/lib/pricing'
import { DEFAULT_AVATAR_URL } from '@/lib/avatar'
import LocaleLink from '@/components/ui/LocaleLink'
import { BackButton } from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewForm } from '@/components/reviews/ReviewForm'

// ─────────────────────────────────────────────────────────────────────
// Workroom — детальная страница проекта для участников.
// Видна владельцу (clientProfileId) и исполнителю (executorProfileId).
// Возможности:
//   • Просмотр всех мета-данных и описания
//   • Управление статусом (Open → InProgress, → Review, → Completed, Cancel)
//   • Список отзывов и форма написания (если статус Completed)
//   • Прямая ссылка на публичную карточку (orders/[id]) для покупателей
// ─────────────────────────────────────────────────────────────────────

const STATUS_FLOW: Record<string, { label: string; cls: string; dot: string }> = {
  Open:       { label: 'Открыт',       cls: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300', dot: 'bg-emerald-400' },
  InProgress: { label: 'В работе',     cls: 'border-sky-400/20 bg-sky-400/[0.06] text-sky-300',             dot: 'bg-sky-400' },
  Review:     { label: 'На проверке',  cls: 'border-violet-400/20 bg-violet-400/[0.06] text-violet-300',    dot: 'bg-violet-400' },
  Completed:  { label: 'Завершён',     cls: 'border-text-muted/20 bg-bg-elevated text-text-secondary',      dot: 'bg-text-muted' },
  Cancelled:  { label: 'Отменён',      cls: 'border-rose-400/20 bg-rose-400/[0.06] text-rose-300',          dot: 'bg-rose-400' },
}

function statusBadge(status: string) {
  return STATUS_FLOW[status] ?? {
    label: status,
    cls:   'border-border bg-bg-elevated text-text-secondary',
    dot:   'bg-text-faint',
  }
}

export default function ProjectWorkroomPage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>
}) {
  const { id } = use(params)
  const { user } = useAuth()

  const [project, setProject] = useState<ProjectDetailDto | null>(null)
  const [reviews, setReviews] = useState<ReviewDto[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const [statusBusy, setStatusBusy] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setErrMsg(null)
    try {
      const [p, rv] = await Promise.all([
        api.projects.get(id),
        api.reviews.forProject(id).catch(() => [] as ReviewDto[]),
      ])
      setProject(p)
      setReviews(rv)
    } catch (e) {
      setErrMsg(e instanceof ApiError ? e.message : 'Не удалось загрузить проект')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  const isOwner    = !!(user?.profileId && project?.clientProfileId === user.profileId)
  const isExecutor = !!(user?.profileId && project?.executorProfileId === user.profileId)
  const isParticipant = isOwner || isExecutor

  /** Список доступных переходов статуса для текущей роли. */
  const transitions = useMemo<Array<{ to: string; label: string; tone: 'primary' | 'danger' | 'neutral' }>>(() => {
    if (!project) return []
    const out: Array<{ to: string; label: string; tone: 'primary' | 'danger' | 'neutral' }> = []
    if (isOwner) {
      if (project.status === 'Open') {
        out.push({ to: 'Cancelled', label: 'Отменить', tone: 'danger' })
      }
      if (project.status === 'InProgress') {
        out.push({ to: 'Review', label: 'Передать на проверку', tone: 'neutral' })
        out.push({ to: 'Cancelled', label: 'Отменить', tone: 'danger' })
      }
      if (project.status === 'Review') {
        out.push({ to: 'Completed', label: 'Принять и завершить', tone: 'primary' })
        out.push({ to: 'InProgress', label: 'Вернуть в работу', tone: 'neutral' })
      }
    }
    if (isExecutor) {
      if (project.status === 'InProgress') {
        out.push({ to: 'Review', label: 'Сдать на проверку', tone: 'primary' })
      }
    }
    return out
  }, [project, isOwner, isExecutor])

  async function handleStatusChange(next: string) {
    if (!project) return
    setStatusBusy(next)
    const prev = project
    setProject({ ...project, status: next })
    try {
      const updated = await api.projects.patchStatus(project.id, next)
      // patchStatus возвращает ProjectSummaryDto — мерджим с текущим detail
      setProject({ ...prev, status: updated.status })
    } catch (e) {
      setProject(prev)
      alert(e instanceof ApiError ? e.message : 'Не удалось изменить статус')
    } finally {
      setStatusBusy(null)
    }
  }

  if (loading) return <WorkroomSkeleton />
  if (errMsg || !project) {
    return (
      <div className="space-y-4">
        <BackButton fallbackHref="/dashboard/projects" />
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-6 text-sm text-red-300">
          {errMsg ?? 'Проект не найден.'}
        </div>
      </div>
    )
  }

  const badge = statusBadge(project.status)
  const canReview = isParticipant && project.status === 'Completed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-6"
    >
      {/* шапка */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton fallbackHref="/dashboard/projects" />
        <div className="flex items-center gap-2">
          <LocaleLink
            href={`/dashboard/orders/${project.id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-white/20 hover:bg-bg-elevated hover:text-text-base"
            title="Открыть публичную карточку"
          >
            <Eye className="h-3.5 w-3.5" />
            Публичная карточка
            <ExternalLink className="h-3 w-3" />
          </LocaleLink>
        </div>
      </div>

      {/* заголовок + статус */}
      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badge.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
          <span className="text-xs text-text-faint">
            Создан {new Date(project.createdAt).toLocaleDateString('ru-RU')}
          </span>
          {project.updatedAt && project.updatedAt !== project.createdAt && (
            <span className="text-xs text-text-faint">
              · обновлён {new Date(project.updatedAt).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-text-base sm:text-[32px]">
          {project.title}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {isOwner && 'Вы — заказчик. Управляйте этапами проекта здесь.'}
          {isExecutor && 'Вы — исполнитель. Здесь идёт работа над задачей.'}
          {!isParticipant && 'Просмотр без права управлять статусом — вы не участник этого проекта.'}
        </p>
      </header>

      {/* основная сетка: метрики + действия */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* метрики */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Бюджет" icon={<Banknote className="h-4 w-4 text-text-muted" />}>
              {project.budget != null ? `${formatTenge(project.budget)} ₸` : 'По договорённости'}
            </Metric>
            <Metric label="Дедлайн" icon={<Calendar className="h-4 w-4 text-text-muted" />}>
              {project.deadline ? new Date(project.deadline).toLocaleDateString('ru-RU') : 'Не указан'}
            </Metric>
            <Metric label="Откликов" icon={<UserIcon className="h-4 w-4 text-text-muted" />}>
              {project.applicationCount}
            </Metric>
          </div>

          {/* описание */}
          <section className="rounded-xl border border-border bg-bg-card p-6">
            <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-faint">
              Описание задачи
            </h2>
            {project.description ? (
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text-base">
                {project.description}
              </p>
            ) : (
              <p className="text-sm text-text-muted">Описание не добавлено.</p>
            )}
          </section>

          {/* отзывы */}
          <section className="rounded-xl border border-border bg-bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-faint">
                <MessageSquare className="h-3 w-3" /> Отзывы по проекту
              </h2>
              {canReview && (
                <button
                  onClick={() => setReviewOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-400/15"
                >
                  <Star className="h-3.5 w-3.5" /> Оставить отзыв
                </button>
              )}
            </div>
            {reviews.length === 0 ? (
              <p className="text-sm text-text-muted">
                Пока никто не оставил отзыв.
                {canReview && ' Будьте первым.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {reviews.map(r => (
                  <li key={r.id} className="rounded-lg border border-border bg-bg-base p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium text-text-base">{r.authorName}</p>
                      <span className="inline-flex items-center gap-0.5 text-amber-300">
                        {Array.from({ length: r.stars }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </span>
                    </div>
                    <p className="mb-1 text-[11px] text-text-faint">
                      {r.direction === 'ClientToExecutor' ? 'Заказчик об исполнителе' : 'Исполнитель о заказчике'}
                    </p>
                    {r.comment && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{r.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* боковая панель: участники + действия */}
        <aside className="space-y-4">
          {/* заказчик */}
          <PartyCard
            title="Заказчик"
            profileId={project.clientProfileId}
            name={project.clientProfileName}
            type={project.clientProfileType}
            highlight={isOwner}
          />

          {/* исполнитель */}
          {project.executorProfileId ? (
            <PartyCard
              title="Исполнитель"
              profileId={project.executorProfileId}
              name={project.executorProfileName ?? '—'}
              type=""
              highlight={isExecutor}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-bg-card/50 p-4 text-center text-xs text-text-muted">
              Исполнитель ещё не назначен
            </div>
          )}

          {/* действия */}
          {transitions.length > 0 && (
            <div className="rounded-xl border border-border bg-bg-card p-4">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-faint">
                Управление этапом
              </h3>
              <div className="flex flex-col gap-2">
                {transitions.map(t => (
                  <button
                    key={t.to}
                    onClick={() => handleStatusChange(t.to)}
                    disabled={statusBusy != null}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 ${
                      t.tone === 'primary'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
                        : t.tone === 'danger'
                        ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15'
                        : 'border-border bg-bg-elevated text-text-secondary hover:bg-bg-hover hover:text-text-base'
                    }`}
                  >
                    {statusBusy === t.to ? (
                      <Clock3 className="h-3.5 w-3.5 animate-spin" />
                    ) : t.tone === 'primary' ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : t.tone === 'danger' ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5" />
                    )}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* статус-помощь когда нечего делать */}
          {transitions.length === 0 && isParticipant && (
            <div className="rounded-xl border border-border bg-bg-card p-4 text-xs text-text-muted">
              {project.status === 'Open' && isOwner && 'Ждём отклики исполнителей. Откликнувшихся можно увидеть на публичной карточке.'}
              {project.status === 'Open' && !isOwner && 'Заказ открыт — ждёт исполнителя.'}
              {project.status === 'Completed' && 'Проект завершён.'}
              {project.status === 'Cancelled' && 'Проект отменён.'}
            </div>
          )}
        </aside>
      </div>

      {reviewOpen && (
        <ReviewForm projectId={project.id} onClose={() => setReviewOpen(false)} />
      )}
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// presentation pieces

function Metric({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <p className="mb-1 text-[11px] uppercase tracking-wider text-text-faint">{label}</p>
      <p className="inline-flex items-center gap-1.5 text-base font-semibold text-text-base">
        {icon}
        {children}
      </p>
    </div>
  )
}

function PartyCard({
  title,
  profileId,
  name,
  type,
  highlight,
}: {
  title:     string
  profileId: string
  name:      string
  type:      string
  highlight: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        highlight ? 'border-accent/40 bg-accent/5' : 'border-border bg-bg-card'
      }`}
    >
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-faint">
        {title} {highlight && <span className="ml-1 text-accent-light">— это вы</span>}
      </p>
      <LocaleLink
        href={`/profiles/${profileId}`}
        className="group flex items-center gap-3 rounded-md p-1 -m-1 transition-colors hover:bg-bg-hover"
      >
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-elevated">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DEFAULT_AVATAR_URL} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-base group-hover:underline underline-offset-4">
            {name}
          </p>
          {type && (
            <p className="truncate text-xs text-text-faint">
              {type === 'Individual' ? 'Частный профиль' : type === 'Company' ? 'Компания' : type === 'Clan' ? 'Команда' : type}
            </p>
          )}
        </div>
      </LocaleLink>
    </div>
  )
}

function WorkroomSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  )
}
