'use client'

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'

/**
 * /dashboard/profile — это «мой профиль».
 *
 * Личная страница пользователя выглядит так же, как и публичная
 * (Instagram-style). Поэтому этот маршрут делает редирект на
 * /profiles/{myProfileId} — там уже есть owner-affordances:
 * закрепление проектов, создание поста, кнопка «Редактировать»,
 * которая ведёт в /dashboard/settings (где меняется основная инфа).
 */
export default function MyProfileRedirectPage() {
  const { user, isLoading } = useAuth()
  const router = useLocaleRouter()

  useEffect(() => {
    if (isLoading) return
    if (user?.profileId) {
      router.replace(`/profiles/${user.profileId}`)
    } else {
      router.replace('/dashboard/settings')
    }
  }, [isLoading, user?.profileId, router])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
    </div>
  )
}
