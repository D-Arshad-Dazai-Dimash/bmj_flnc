'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api, type ProfileSummaryDto, type RatingSummaryDto } from '@/lib/api'
import { RatingBadge } from '@/components/reviews/RatingBadge'
import { ReviewsList } from '@/components/reviews/ReviewsList'
import { ShieldCheck, Users } from 'lucide-react'

/**
 * Публичная страница профиля: краткая карточка + сводка рейтинга
 * + постраничные отзывы (кэш скрытых не показываем).
 *
 * Используется и заказчиками, и исполнителями для оценки контрагента
 * перед началом сотрудничества.
 */
export default function PublicProfilePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [profile, setProfile] = useState<ProfileSummaryDto | null>(null)
  const [summary, setSummary] = useState<RatingSummaryDto | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.profiles.get(id).catch(() => null),
      api.reviews.summary(id).catch(() => null),
    ]).then(([p, s]) => {
      if (cancelled) return
      if (!p) setError('Профиль не найден')
      setProfile(p)
      setSummary(s)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return <div className="p-8 text-text-muted">Загрузка…</div>
  }
  if (error || !profile) {
    return <div className="p-8 text-red-300">{error ?? 'Не удалось загрузить профиль'}</div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="rounded-xl border border-border bg-bg-card p-6">
        <div className="flex items-start gap-4">
          {profile.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logoUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-bg-elevated" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-text-base truncate">{profile.name}</h1>
              {profile.isVerified && (
                <span title="Верифицирован" className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                  <ShieldCheck className="h-3 w-3" /> Верифицирован
                </span>
              )}
              <RatingBadge profileId={profile.id} initialSummary={summary} size="md" />
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
              <span>{profile.accountType}</span>
              {profile.memberCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {profile.memberCount}
                </span>
              )}
              <span>с {new Date(profile.createdAt).toLocaleDateString('ru')}</span>
            </div>
            {profile.bio && (
              <p className="mt-3 text-sm text-text-secondary whitespace-pre-wrap">{profile.bio}</p>
            )}
          </div>
        </div>
      </header>

      {summary && summary.ratingsCount > 0 && (
        <section className="rounded-xl border border-border bg-bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-base">Оценки</h2>
            <div className="text-sm text-text-muted">
              {summary.avgRating?.toFixed(2)} · {summary.ratingsCount} отзывов
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {([5, 4, 3, 2, 1] as const).map(n => {
              const count = summary.breakdown[String(n)] ?? 0
              const pct = summary.ratingsCount > 0 ? (count / summary.ratingsCount) * 100 : 0
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

      <section>
        <h2 className="mb-3 text-base font-semibold text-text-base">Отзывы</h2>
        <ReviewsList profileId={profile.id} pageSize={10} />
      </section>
    </div>
  )
}
