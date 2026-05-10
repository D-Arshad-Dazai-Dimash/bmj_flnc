'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { canAccessPath, defaultRouteForRole, isAdminRole } from '@/lib/roleGuard'

export type GuardArea = 'dashboard' | 'admin'

interface UseRoleGuardResult {
  /** Загружается ли auth-контекст. */
  isLoading: boolean
  /** Прошёл ли пользователь все проверки и может рендерить контент. */
  allowed: boolean
}

/**
 * Декларативный role-guard для защищённых layout'ов.
 *
 * Логика:
 *  1. Не аутентифицирован → redirect на /auth (или /admin-auth для admin-области).
 *  2. Аутентифицирован, но роль не подходит для зоны → redirect на default-роут роли.
 *  3. Иначе → allowed=true.
 *
 * Backend всё равно проверяет [Authorize] и [RequireRole] — это только UX-guard.
 */
export function useRoleGuard(area: GuardArea): UseRoleGuardResult {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useLocaleRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated || !user) {
      router.replace(area === 'admin' ? '/admin-auth' : '/auth?mode=login')
      setAllowed(false)
      return
    }

    const targetPath = area === 'admin' ? '/admin' : '/dashboard'
    if (!canAccessPath(user.role, targetPath)) {
      router.replace(defaultRouteForRole(user.role))
      setAllowed(false)
      return
    }

    setAllowed(true)
  }, [isLoading, isAuthenticated, user?.role, area, router])

  return { isLoading, allowed }
}

export { isAdminRole }
