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
  type ApplicationListItemDto,
} from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatTenge } from '@/lib/pricing'
import { DEFAULT_AVATAR_URL } from '@/lib/avatar'
import LocaleLink from '@/components/ui/LocaleLink'
import { BackButton } from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'

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
  const [contractOpen, setContractOpen] = useState<{ executorProfileId: string; executorName: string } | null>(null)
  const router = useLocaleRouter()

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

          {/* откликнувшиеся (только для владельца) */}
          {isOwner && (
            <ApplicantsSection
              project={project}
              myProfileId={user!.profileId!}
              onChat={(threadId) => router.push(`/dashboard/chat/${encodeURIComponent(threadId)}`)}
              onApprove={(executorProfileId, executorName) =>
                setContractOpen({ executorProfileId, executorName })
              }
              onChanged={reload}
            />
          )}

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

      {contractOpen && (
        <CreateContractModal
          project={project}
          executorProfileId={contractOpen.executorProfileId}
          executorName={contractOpen.executorName}
          meId={user!.profileId!}
          meName={user!.profileName ?? 'Я'}
          onClose={() => setContractOpen(null)}
          onCreated={(contractId) => {
            setContractOpen(null)
            router.push(`/dashboard/contracts/${contractId}`)
          }}
        />
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

// ─────────────────────────────────────────────────────────────────────
// Откликнувшиеся: backend пока не отдаёт список заявок, поэтому
// извлекаем потенциальных кандидатов из локальных чат-тредов, в которых
// есть сообщение, помеченное projectId == текущему проекту.
// ─────────────────────────────────────────────────────────────────────


function ApplicantsSection({
  project,
  myProfileId,
  onChat,
  onApprove,
  onChanged,
}: {
  project: ProjectDetailDto
  myProfileId: string
  onChat: (threadId: string) => void
  onApprove: (executorProfileId: string, executorName: string) => void
  onChanged: () => void
}) {
  const [apps, setApps] = useState<ApplicationListItemDto[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const list = await api.applications.listForProject(project.id)
      setApps(list)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Не удалось загрузить отклики')
    }
  }, [project.id])

  useEffect(() => {
    void reload()
    const t = setInterval(() => void reload(), 8000)
    return () => clearInterval(t)
  }, [reload])

  async function handleAccept(appId: string, executorProfileId: string, executorName: string) {
    setBusyId(appId)
    try {
      await api.applications.accept(appId)
      await reload()
      onChanged()
      onApprove(executorProfileId, executorName)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Не удалось одобрить отклик')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(appId: string) {
    setBusyId(appId)
    try {
      await api.applications.reject(appId)
      await reload()
      onChanged()
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Не удалось отклонить отклик')
    } finally {
      setBusyId(null)
    }
  }

  if (apps && apps.length === 0 && project.applicationCount === 0) return null

  return (
    <section className="rounded-xl border border-border bg-bg-card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-faint">
          <UserIcon className="h-3 w-3" /> Откликнувшиеся
          {project.applicationCount > 0 && (
            <span className="ml-1 rounded-full bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
              {project.applicationCount}
            </span>
          )}
        </h2>
      </div>

      {err && (
        <div className="mb-2 rounded-md border border-red-500/20 bg-red-500/[0.06] p-2 text-xs text-red-300">
          {err}
        </div>
      )}

      {apps == null ? (
        <p className="text-sm text-text-muted">Загрузка откликов…</p>
      ) : apps.length === 0 ? (
        <p className="text-sm text-text-muted">Откликов пока нет.</p>
      ) : (
        <ul className="space-y-2">
          {apps.map(a => {
            const statusLabel =
              a.status === 'Pending' ? 'Ожидает' :
              a.status === 'Accepted' ? 'Принят' :
              a.status === 'Rejected' ? 'Отклонён' :
              a.status === 'Withdrawn' ? 'Отозван' : a.status
            const statusCls =
              a.status === 'Accepted' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' :
              a.status === 'Rejected' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' :
              a.status === 'Withdrawn' ? 'border-border bg-bg-elevated text-text-faint' :
              'border-amber-400/30 bg-amber-400/10 text-amber-200'
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-base p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <LocaleLink
                      href={`/profiles/${a.applicantProfileId}`}
                      className="text-sm font-medium text-text-base hover:underline"
                    >
                      {a.applicantProfileName}
                    </LocaleLink>
                    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${statusCls}`}>
                      {statusLabel}
                    </span>
                    {a.proposedBudget != null && (
                      <span className="text-[11px] text-text-muted">{formatTenge(a.proposedBudget)}</span>
                    )}
                  </div>
                  {a.coverLetter && (
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-text-muted">{a.coverLetter}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {a.chatThreadId && (
                    <button
                      onClick={() => onChat(a.chatThreadId!)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-2.5 py-1.5 text-[11.5px] text-text-secondary hover:bg-bg-elevated hover:text-text-base"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Чат
                    </button>
                  )}
                  {a.status === 'Pending' && (
                    <>
                      <button
                        disabled={busyId === a.id}
                        onClick={() => handleReject(a.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11.5px] text-rose-300 hover:bg-rose-500/15 disabled:opacity-50"
                      >
                        <XCircle className="h-3 w-3" />
                        Отклонить
                      </button>
                      <button
                        disabled={busyId === a.id}
                        onClick={() => handleAccept(a.id, a.applicantProfileId, a.applicantProfileName)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/90 px-2.5 py-1.5 text-[11.5px] font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Принять
                      </button>
                    </>
                  )}
                  {a.status === 'Accepted' && (
                    <button
                      onClick={() => onApprove(a.applicantProfileId, a.applicantProfileName)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11.5px] text-emerald-200 hover:bg-emerald-500/15"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Создать контракт
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Модалка создания контракта (этапы по умолчанию = 1 на всю сумму).
// ─────────────────────────────────────────────────────────────────────
function CreateContractModal({
  project,
  executorProfileId,
  executorName,
  meId,
  meName,
  onClose,
  onCreated,
}: {
  project: ProjectDetailDto
  executorProfileId: string
  executorName: string
  meId: string
  meName: string
  onClose: () => void
  onCreated: (contractId: string) => void
}) {
  const defaultTotal = project.budget ?? 0
  const [total, setTotal] = useState<string>(defaultTotal ? String(defaultTotal) : '')
  const [milestones, setMilestones] = useState<Array<{ title: string; amount: string; dueDate: string }>>([
    { title: 'Полный объём работ', amount: defaultTotal ? String(defaultTotal) : '', dueDate: project.deadline ?? '' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const addMilestone = () => setMilestones(prev => [...prev, { title: '', amount: '', dueDate: '' }])
  const removeMilestone = (idx: number) => setMilestones(prev => prev.filter((_, i) => i !== idx))
  const updateMilestone = (idx: number, key: 'title' | 'amount' | 'dueDate', value: string) => {
    setMilestones(prev => prev.map((m, i) => (i === idx ? { ...m, [key]: value } : m)))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    const totalNum = Number(total.replace(/\s/g, ''))
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      setErr('Укажите сумму контракта')
      return
    }
    if (milestones.length === 0) {
      setErr('Должен быть хотя бы один этап')
      return
    }
    const parsed = milestones.map(m => ({
      title: m.title.trim(),
      amount: Number(m.amount.toString().replace(/\s/g, '')),
      dueDate: m.dueDate || undefined,
    }))
    if (parsed.some(m => !m.title || !Number.isFinite(m.amount) || m.amount <= 0)) {
      setErr('У каждого этапа должны быть название и положительная сумма')
      return
    }
    const sum = parsed.reduce((a, b) => a + b.amount, 0)
    if (Math.abs(sum - totalNum) > 0.5) {
      setErr(`Сумма этапов (${sum.toLocaleString('ru-RU')} ₸) не совпадает с суммой контракта (${totalNum.toLocaleString('ru-RU')} ₸)`)
      return
    }
    setSubmitting(true)
    try {
      const c = await api.contracts.create({
        projectId: project.id,
        executorProfileId,
        totalAmount: totalNum,
        milestones: parsed.map(m => ({
          title: m.title,
          amount: m.amount,
          dueDate: m.dueDate ?? null,
        })),
      })
      onCreated(c.id)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Не удалось создать контракт')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-bg-card p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-base">Создать контракт</h3>
            <p className="mt-0.5 text-xs text-text-muted">с {executorName} по проекту «{project.title}»</p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-base">
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">Сумма контракта, ₸</span>
            <input
              value={total}
              onChange={e => setTotal(e.target.value.replace(/[^\d\s]/g, ''))}
              inputMode="numeric"
              className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-text-base focus:border-accent/60 focus:outline-none"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Этапы</span>
              <button
                type="button"
                onClick={addMilestone}
                className="text-[11px] text-text-secondary hover:text-text-base"
              >
                + добавить этап
              </button>
            </div>
            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-bg-base p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] text-text-faint">Этап #{idx + 1}</span>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(idx)}
                        className="text-[11px] text-text-faint hover:text-red-300"
                      >
                        удалить
                      </button>
                    )}
                  </div>
                  <input
                    placeholder="Название этапа"
                    value={m.title}
                    onChange={e => updateMilestone(idx, 'title', e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-border bg-bg-card px-2.5 py-1.5 text-[13px] text-text-base focus:border-accent/60 focus:outline-none"
                  />
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <input
                      placeholder="Сумма, ₸"
                      value={m.amount}
                      onChange={e => updateMilestone(idx, 'amount', e.target.value.replace(/[^\d\s]/g, ''))}
                      inputMode="numeric"
                      className="rounded-md border border-border bg-bg-card px-2.5 py-1.5 text-[13px] text-text-base focus:border-accent/60 focus:outline-none"
                    />
                    <input
                      type="date"
                      value={m.dueDate}
                      onChange={e => updateMilestone(idx, 'dueDate', e.target.value)}
                      className="rounded-md border border-border bg-bg-card px-2.5 py-1.5 text-[13px] text-text-base focus:border-accent/60 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {err && (
            <div className="rounded-md border border-red-500/20 bg-red-500/[0.06] p-2 text-xs text-red-300">
              {err}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border bg-bg-card px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/90 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {submitting ? 'Создание…' : 'Создать контракт'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


