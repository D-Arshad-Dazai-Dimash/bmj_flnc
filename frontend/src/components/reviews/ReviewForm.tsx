'use client'

import { useEffect, useMemo, useState } from 'react'
import { api, type CreateReviewRequest, type ReviewDto } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ReviewFormProps {
  projectId: string
  /** Закрыть модал. */
  onClose: () => void
  /** Колбэк после успешного создания. */
  onCreated?: (review: ReviewDto) => void
}

/**
 * Модалка для оставления отзыва по проекту.
 * Бэк сам определит направление (клиент↔исполнитель) по членству юзера.
 */
export function ReviewForm({ projectId, onClose, onCreated }: ReviewFormProps) {
  const [stars, setStars]   = useState<number>(0)
  const [hover, setHover]   = useState<number>(0)
  const [comment, setComment] = useState('')
  const [tags, setTags]     = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    api.reviews.tags().then(setAllTags).catch(() => setAllTags([]))
  }, [])

  const canSubmit = useMemo(
    () => stars >= 1 && stars <= 5 && !busy && comment.length <= 2000,
    [stars, busy, comment.length],
  )

  function toggleTag(t: string) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : prev.length >= 8 ? prev : [...prev, t])
  }

  async function submit() {
    setBusy(true); setError(null)
    try {
      const dto: CreateReviewRequest = {
        stars,
        comment: comment.trim() || null,
        tags: tags.length ? tags : null,
      }
      const r = await api.reviews.create(projectId, dto)
      onCreated?.(r)
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось отправить отзыв.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-bg-card p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-semibold text-text-base">Оставить отзыв</h2>
        <p className="mb-4 text-xs text-text-muted">
          Бэкенд определит, кому адресован отзыв (заказчику или исполнителю), исходя из вашей роли в проекте.
        </p>

        {/* Звёзды */}
        <div className="mb-4 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map(n => {
            const active = (hover || stars) >= n
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} звёзд`}
                className={cn(
                  'text-3xl transition-colors',
                  active ? 'text-amber-300' : 'text-text-muted/40 hover:text-amber-200/70',
                )}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setStars(n)}
              >★</button>
            )
          })}
          {stars > 0 && <span className="ml-2 text-sm text-text-secondary">{stars} / 5</span>}
        </div>

        {/* Теги */}
        {allTags.length > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 text-xs uppercase tracking-wider text-text-muted">Теги (до 8)</div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(t => {
                const on = tags.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs transition-colors',
                      on
                        ? 'border-accent-light/40 bg-accent-light/15 text-accent-light'
                        : 'border-border bg-bg-elevated text-text-secondary hover:border-border-bright',
                    )}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Комментарий */}
        <div className="mb-4">
          <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">
            Комментарий (необязательно)
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-base outline-none focus:border-border-focus"
            placeholder="Что понравилось, что нет…"
          />
          <div className="mt-0.5 text-right text-[10px] text-text-muted">{comment.length}/2000</div>
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Отмена</Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {busy ? 'Отправка…' : 'Отправить'}
          </Button>
        </div>
      </div>
    </div>
  )
}
