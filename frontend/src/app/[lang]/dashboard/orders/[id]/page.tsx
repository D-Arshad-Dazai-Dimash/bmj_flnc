'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Banknote,
  Calendar,
  Clock3,
  Heart,
  Send,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react'
import { api, ApiError, type ProjectDetailDto } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatTenge } from '@/lib/pricing'
import LocaleLink from '@/components/ui/LocaleLink'
import { BackButton } from '@/components/ui/back-button'
import { Tooltip } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { getLikedIds, toggleLike } from '@/lib/socialStore'

function ProposalModal({
  project,
  onClose,
  onSubmit,
  sending,
}: {
  project: ProjectDetailDto
  onClose: () => void
  onSubmit: (data: { coverLetter: string; proposedBudget: number | null }) => void
  sending: boolean
}) {
  const [coverLetter, setCoverLetter] = useState('')
  const [budget, setBudget] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="w-full max-w-lg rounded-[18px] border border-border bg-bg-card p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-base">Отклик на заказ</h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-[8px] border border-transparent p-1.5 text-text-faint transition-colors hover:border-border hover:bg-bg-hover"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 truncate text-sm text-text-secondary">{project.title}</p>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-text-secondary">Сопроводительное письмо</span>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value.slice(0, 500))}
              rows={4}
              className="w-full resize-none rounded-[10px] border border-border bg-bg-elevated px-3 py-2.5 text-sm text-text-base placeholder:text-text-faint focus:border-border-focus focus:outline-none"
              placeholder="Опишите релевантный опыт и подход к задаче"
            />
            <span className="text-xs text-text-faint">{coverLetter.length}/500</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-text-secondary">Предложенная цена (₸)</span>
            <input
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-bg-elevated px-3 py-2.5 text-sm text-text-base placeholder:text-text-faint focus:border-border-focus focus:outline-none"
              placeholder={project.budget != null ? String(project.budget) : 'Например 200000'}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-[8px] border border-border bg-bg-elevated px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Отмена
          </button>
          <button
            onClick={() =>
              onSubmit({
                coverLetter: coverLetter.trim(),
                proposedBudget: budget ? Number(budget) : null,
              })
            }
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-150 hover:bg-white/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? 'Отправляем...' : 'Отправить отклик'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    Open: {
      label: 'Открыт',
      cls: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300',
      dot: 'bg-emerald-400',
    },
    InProgress: {
      label: 'В работе',
      cls: 'border-sky-400/20 bg-sky-400/[0.06] text-sky-300',
      dot: 'bg-sky-400',
    },
    Completed: {
      label: 'Завершён',
      cls: 'border-violet-400/20 bg-violet-400/[0.06] text-violet-300',
      dot: 'bg-violet-400',
    },
    Cancelled: {
      label: 'Отменён',
      cls: 'border-rose-400/20 bg-rose-400/[0.06] text-rose-300',
      dot: 'bg-rose-400',
    },
  }
  return map[status] ?? {
    label: status,
    cls: 'border-border bg-bg-elevated text-text-secondary',
    dot: 'bg-text-faint',
  }
}

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>
}) {
  const { id } = use(params)
  const { user, isAuthenticated } = useAuth()

  const [project, setProject] = useState<ProjectDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const [liked, setLiked] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [proposalSent, setProposalSent] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErrMsg(null)
    api.projects
      .get(id)
      .then((data) => {
        if (!alive) return
        setProject(data)
      })
      .catch((e) => {
        if (!alive) return
        setErrMsg(e instanceof ApiError ? e.message : 'Не удалось загрузить заказ')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  // sync like state from localStorage when user/project meta becomes available
  useEffect(() => {
    if (!user?.id) return
    setLiked(getLikedIds(user.id).has(id))
  }, [user?.id, id])

  const onToggleLike = useCallback(() => {
    if (!user?.id) return
    // optimistic
    setLiked((prev) => !prev)
    toggleLike(user.id, id)
  }, [user?.id, id])

  const handleProposalSubmit = useCallback(
    async (data: { coverLetter: string; proposedBudget: number | null }) => {
      if (!isAuthenticated || !user?.profileId || !project) {
        setErrMsg('Войдите в аккаунт исполнителя, чтобы отправлять отклики.')
        return
      }
      setSending(true)
      try {
        await api.projects.apply(project.id, {
          applicantProfileId: user.profileId,
          coverLetter: data.coverLetter || undefined,
          proposedBudget: data.proposedBudget ?? undefined,
        })
        setProposalSent(true)
        setProposalOpen(false)
      } catch (e) {
        setErrMsg(e instanceof ApiError ? e.message : 'Не удалось отправить отклик')
      } finally {
        setSending(false)
      }
    },
    [isAuthenticated, user?.profileId, project],
  )

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    )
  }

  if (errMsg || !project) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <BackButton fallbackHref="/dashboard/orders" />
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-6 text-sm text-red-300">
          {errMsg ?? 'Заказ не найден.'}
        </div>
      </div>
    )
  }

  const badge = statusBadge(project.status)
  const isOwnProject = user?.profileId === project.clientProfileId
  const canApply =
    project.status === 'Open' && isAuthenticated && !isOwnProject && !proposalSent

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      {/* шапка с кнопкой назад */}
      <div className="mb-6 flex items-center justify-between">
        <BackButton fallbackHref="/dashboard/orders" />

        <div className="flex items-center gap-2">
          <Tooltip label={liked ? 'Убрать из понравившихся' : 'Добавить в понравившиеся'}>
            <button
              onClick={onToggleLike}
              disabled={!user?.id}
              aria-pressed={liked}
              aria-label="Нравится"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition-all ${
                liked
                  ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
                  : 'border-border bg-bg-card text-text-secondary hover:border-white/20 hover:bg-bg-hover hover:text-text-base'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Heart
                className={`h-4 w-4 transition-transform ${liked ? 'fill-current scale-110' : ''}`}
              />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* заголовок */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badge.cls}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
          <span className="text-xs text-text-faint">
            Опубликован {new Date(project.createdAt).toLocaleDateString('ru-RU')}
          </span>
        </div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-text-base sm:text-[32px]">
          {project.title}
        </h1>
      </div>

      {/* ключевые метрики */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-text-faint">Бюджет</p>
          <p className="inline-flex items-center gap-1.5 text-base font-semibold text-text-base">
            <Banknote className="h-4 w-4 text-text-muted" />
            {project.budget != null ? formatTenge(project.budget) : 'По договорённости'}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-text-faint">Дедлайн</p>
          <p className="inline-flex items-center gap-1.5 text-base font-semibold text-text-base">
            <Calendar className="h-4 w-4 text-text-muted" />
            {project.deadline
              ? new Date(project.deadline).toLocaleDateString('ru-RU')
              : 'Не указан'}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-text-faint">Откликов</p>
          <p className="inline-flex items-center gap-1.5 text-base font-semibold text-text-base">
            <Users className="h-4 w-4 text-text-muted" />
            {project.applicationCount}
          </p>
        </div>
      </div>

      {/* описание */}
      <section className="mb-8 rounded-xl border border-border bg-bg-card p-6">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-faint">
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

      {/* заказчик */}
      <section className="mb-8 rounded-xl border border-border bg-bg-card p-6">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-faint">
          Заказчик
        </h2>
        <LocaleLink
          href={`/profiles/${project.clientProfileId}`}
          className="group inline-flex items-center gap-3 rounded-lg p-1 -m-1 transition-colors hover:bg-bg-hover"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-elevated">
            <UserIcon className="h-4 w-4 text-text-muted" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-base group-hover:underline underline-offset-4">
              {project.clientProfileName}
            </p>
            <p className="text-xs text-text-faint">
              {project.clientProfileType === 'Individual'
                ? 'Частный заказчик'
                : project.clientProfileType === 'Company'
                  ? 'Компания'
                  : 'Команда'}
            </p>
          </div>
        </LocaleLink>
      </section>

      {/* CTA */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-border bg-bg-card/90 p-4 shadow-lg backdrop-blur-sm">
        <div className="text-sm">
          {project.status !== 'Open' ? (
            <span className="text-text-muted">Заказ закрыт для откликов.</span>
          ) : isOwnProject ? (
            <span className="text-text-muted">Это ваш собственный заказ.</span>
          ) : proposalSent ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <Clock3 className="h-3.5 w-3.5" />
              Отклик отправлен
            </span>
          ) : !isAuthenticated ? (
            <span className="text-text-muted">
              <LocaleLink
                href="/auth/login"
                className="text-text-base underline-offset-4 hover:underline"
              >
                Войдите
              </LocaleLink>
              , чтобы отправить отклик.
            </span>
          ) : (
            <span className="text-text-muted">
              Подайте заявку и заказчик получит уведомление.
            </span>
          )}
        </div>

        <button
          onClick={() => setProposalOpen(true)}
          disabled={!canApply}
          className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-150 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          Откликнуться
        </button>
      </div>

      <AnimatePresence>
        {proposalOpen && (
          <ProposalModal
            project={project}
            onClose={() => setProposalOpen(false)}
            onSubmit={handleProposalSubmit}
            sending={sending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
