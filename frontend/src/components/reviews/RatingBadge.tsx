'use client'

import { useEffect, useState } from 'react'
import { api, type RatingSummaryDto } from '@/lib/api'
import { cn } from '@/lib/utils'

interface RatingBadgeProps {
  profileId: string
  /** Уже загруженная сводка — если есть, не делаем запрос. */
  initialSummary?: RatingSummaryDto | null
  /** Размер. */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Компактный бейдж рейтинга профиля: ★ 4.87 · 23.
 * Если оценок нет — показываем пунктир.
 */
export function RatingBadge({ profileId, initialSummary, size = 'sm', className }: RatingBadgeProps) {
  const [data, setData] = useState<RatingSummaryDto | null>(initialSummary ?? null)
  const [loading, setLoading] = useState(initialSummary === undefined)

  useEffect(() => {
    if (initialSummary !== undefined) return
    let cancelled = false
    setLoading(true)
    api.reviews.summary(profileId)
      .then(s => { if (!cancelled) setData(s) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [profileId, initialSummary])

  const sizes = size === 'md'
    ? 'text-sm px-2.5 py-1'
    : 'text-xs px-2 py-0.5'

  if (loading) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-md bg-bg-elevated text-text-muted', sizes, className)}>
        ★ <span className="opacity-60">…</span>
      </span>
    )
  }

  if (!data || data.ratingsCount === 0 || data.avgRating == null) {
    return (
      <span
        title="Пока нет оценок"
        className={cn('inline-flex items-center gap-1 rounded-md bg-bg-elevated text-text-muted', sizes, className)}
      >
        ★ <span>—</span>
      </span>
    )
  }

  return (
    <span
      title={`Средняя оценка из ${data.ratingsCount} отзывов`}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-amber-400/25 bg-amber-400/10 text-amber-200',
        sizes,
        className,
      )}
    >
      <span aria-hidden>★</span>
      <span className="font-semibold">{data.avgRating.toFixed(2)}</span>
      <span className="text-amber-200/60">·</span>
      <span className="text-amber-100/80">{data.ratingsCount}</span>
    </span>
  )
}
