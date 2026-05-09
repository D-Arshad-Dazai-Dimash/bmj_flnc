'use client'

import { useEffect, useState } from 'react'
import { api, type ReviewDto, type ReviewsPageDto } from '@/lib/api'
import { cn } from '@/lib/utils'

type FilterMode = 'all' | 'visible' | 'hidden'

/**
 * Модерация отзывов: лента самых свежих с фильтром (все / видимые / скрытые).
 * Действия — Hide / Restore — на каждой карточке.
 */
export default function AdminReviewsPage() {
  const [data, setData]       = useState<ReviewsPageDto | null>(null)
  const [page, setPage]       = useState(1)
  const [filter, setFilter]   = useState<FilterMode>('all')
  const [reload, setReload]   = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const hidden = filter === 'all' ? undefined : filter === 'hidden'
    api.adminReviews.listRecent(page, 20, hidden)
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [page, filter, reload])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-base">Модерация отзывов</h1>
        <p className="mt-1 text-sm text-text-muted">
          Скрытые отзывы исключаются из публичного списка и расчёта рейтинга,
          но сохраняются в аудит.
        </p>
      </header>

      <div className="flex items-center gap-2">
        {(['all', 'visible', 'hidden'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setFilter(m); setPage(1) }}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs',
              filter === m
                ? 'border-accent-light/40 bg-accent-light/15 text-accent-light'
                : 'border-border bg-bg-elevated text-text-secondary hover:border-border-bright',
            )}
          >
            {m === 'all' ? 'Все' : m === 'visible' ? 'Видимые' : 'Скрытые'}
          </button>
        ))}
        <div className="ml-auto text-xs text-text-muted">
          {data ? `${data.total} всего` : ''}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-text-muted">Загрузка…</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-sm text-text-muted">Нет отзывов.</div>
      ) : (
        <div className="space-y-3">
          {data.items.map(r => (
            <ModerationCard key={r.id} review={r} onChanged={() => setReload(n => n + 1)} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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

function ModerationCard({ review, onChanged }: { review: ReviewDto; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)

  async function hide() {
    const reason = window.prompt('Причина скрытия (5–500 символов):', '')
    if (!reason) return
    setBusy(true)
    try { await api.adminReviews.hide(review.id, reason); onChanged() }
    catch (e) { alert(e instanceof Error ? e.message : 'Ошибка') }
    finally  { setBusy(false) }
  }

  async function restore() {
    setBusy(true)
    try { await api.adminReviews.restore(review.id); onChanged() }
    catch (e) { alert(e instanceof Error ? e.message : 'Ошибка') }
    finally  { setBusy(false) }
  }

  return (
    <div className={cn(
      'rounded-lg border border-border bg-bg-card p-4',
      review.isHidden && 'border-red-500/30 bg-red-500/5',
    )}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <a href={`/ru/profiles/${review.authorProfileId}`} target="_blank" rel="noreferrer"
             className="font-medium text-text-base hover:text-accent-light">
            {review.authorName}
          </a>
          <span>→</span>
          <a href={`/ru/profiles/${review.targetProfileId}`} target="_blank" rel="noreferrer"
             className="hover:text-accent-light">
            target
          </a>
          <span>·</span>
          <span>{review.projectTitle}</span>
          <span>·</span>
          <span>{new Date(review.createdAt).toLocaleString('ru')}</span>
          <span>·</span>
          <span>{review.direction === 'ClientToExecutor' ? 'клиент → исполнитель' : 'исполнитель → клиент'}</span>
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

      <div className="mt-3 flex justify-end gap-2">
        {review.isHidden ? (
          <button disabled={busy} onClick={restore}
            className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-xs text-text-secondary hover:border-border-bright disabled:opacity-50">
            Восстановить
          </button>
        ) : (
          <button disabled={busy} onClick={hide}
            className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/15 disabled:opacity-50">
            Скрыть
          </button>
        )}
      </div>
    </div>
  )
}

