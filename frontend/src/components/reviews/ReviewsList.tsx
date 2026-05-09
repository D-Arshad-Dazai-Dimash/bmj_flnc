'use client'

import { useEffect, useState } from 'react'
import { api, type ReviewDto, type ReviewsPageDto } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ReviewsListProps {
  profileId: string
  pageSize?: number
  /** Кнопки модерации (для админ-вьюх). */
  showModeration?: boolean
  onChanged?: () => void
}

/**
 * Постраничный список отзывов профиля.
 * Скрытые модератором отзывы публично не показываются.
 */
export function ReviewsList({ profileId, pageSize = 10, showModeration, onChanged }: ReviewsListProps) {
  const [data, setData] = useState<ReviewsPageDto | null>(null)
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.reviews.forProfile(profileId, page, pageSize)
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [profileId, page, pageSize, reload])

  if (loading) return <div className="text-sm text-text-muted">Загрузка отзывов…</div>
  if (!data || data.items.length === 0) {
    return <div className="text-sm text-text-muted">Пока нет отзывов.</div>
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))

  return (
    <div className="space-y-3">
      {data.items.map(r => (
        <ReviewCard
          key={r.id}
          review={r}
          showModeration={showModeration}
          onChanged={() => { onChanged?.(); setReload(n => n + 1) }}
        />
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="rounded-md border border-border bg-bg-elevated px-3 py-1 text-xs text-text-secondary disabled:opacity-40 hover:border-border-bright"
          >← Назад</button>
          <span className="text-xs text-text-muted">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-md border border-border bg-bg-elevated px-3 py-1 text-xs text-text-secondary disabled:opacity-40 hover:border-border-bright"
          >Вперёд →</button>
        </div>
      )}
    </div>
  )
}

function ReviewCard({
  review, showModeration, onChanged,
}: { review: ReviewDto; showModeration?: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)

  async function hide() {
    const reason = window.prompt('Причина скрытия (5–500 символов):', '')
    if (!reason) return
    setBusy(true)
    try {
      await api.adminReviews.hide(review.id, reason)
      onChanged()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка')
    } finally { setBusy(false) }
  }

  async function restore() {
    setBusy(true)
    try {
      await api.adminReviews.restore(review.id)
      onChanged()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка')
    } finally { setBusy(false) }
  }

  return (
    <div className={cn(
      'rounded-lg border border-border bg-bg-card p-4',
      review.isHidden && 'opacity-60',
    )}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-base">{review.authorName}</span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted">{new Date(review.createdAt).toLocaleDateString('ru')}</span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted">{review.projectTitle}</span>
        </div>
        <div className="flex items-center gap-1 text-amber-300">
          {[1, 2, 3, 4, 5].map(n => (
            <span key={n} className={n <= review.stars ? 'text-amber-300' : 'text-text-muted/30'}>★</span>
          ))}
        </div>
      </div>

      {review.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {review.tags.map(t => (
            <span key={t} className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
              {t}
            </span>
          ))}
        </div>
      )}

      {review.comment && (
        <p className="text-sm text-text-secondary whitespace-pre-wrap">{review.comment}</p>
      )}

      {showModeration && (
        <div className="mt-3 flex justify-end gap-2">
          {review.isHidden ? (
            <button
              disabled={busy}
              onClick={restore}
              className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-xs text-text-secondary hover:border-border-bright disabled:opacity-50"
            >Восстановить</button>
          ) : (
            <button
              disabled={busy}
              onClick={hide}
              className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/15 disabled:opacity-50"
            >Скрыть</button>
          )}
        </div>
      )}
    </div>
  )
}
