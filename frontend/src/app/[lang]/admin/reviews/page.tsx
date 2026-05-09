'use client'

import { useState } from 'react'
import { ReviewsList } from '@/components/reviews/ReviewsList'

/**
 * Модерация отзывов: вводим ID профиля, видим его отзывы с кнопками
 * «Скрыть» / «Восстановить». Минимум интерфейса — основное API на бэке.
 */
export default function AdminReviewsPage() {
  const [profileId, setProfileId] = useState('')
  const [active, setActive]       = useState<string | null>(null)

  function load(e: React.FormEvent) {
    e.preventDefault()
    const v = profileId.trim()
    setActive(v.length > 0 ? v : null)
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-base">Модерация отзывов</h1>
        <p className="mt-1 text-sm text-text-muted">
          Введите ID профиля. Скрытые отзывы исключаются из публичного списка
          и из расчёта рейтинга, но сохраняются в аудит.
        </p>
      </header>

      <form onSubmit={load} className="flex max-w-xl items-center gap-2">
        <input
          value={profileId}
          onChange={e => setProfileId(e.target.value)}
          placeholder="UUID профиля"
          className="flex-1 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-base outline-none focus:border-border-focus"
        />
        <button
          type="submit"
          className="rounded-md border border-border bg-bg-elevated px-4 py-2 text-sm text-text-secondary hover:border-border-bright"
        >
          Загрузить
        </button>
      </form>

      {active && (
        <section className="max-w-3xl">
          <ReviewsList profileId={active} pageSize={20} showModeration />
        </section>
      )}
    </div>
  )
}
