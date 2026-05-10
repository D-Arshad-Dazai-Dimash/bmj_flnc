/**
 * Декларативная карта ролей и их разрешённых маршрутов.
 *
 * Best practice: единое место для role-based routing, чтобы:
 *   - не дублировать `if (role === 'Admin')` по компонентам,
 *   - избежать race condition в useEffect (нет лишних деривированных значений в deps),
 *   - легко добавлять новые роли/маршруты.
 *
 * ВАЖНО: это UX-guard. Реальная проверка прав — на backend через [Authorize] и [RequireRole].
 */

export type AppRole = 'Member' | 'Moderator' | 'SeniorAdmin' | 'HeadAdmin'

export const ADMIN_ROLES: ReadonlyArray<AppRole> = ['Moderator', 'SeniorAdmin', 'HeadAdmin']

const ROLE_RANK: Record<AppRole, number> = {
  Member: 0,
  Moderator: 1,
  SeniorAdmin: 2,
  HeadAdmin: 3,
}

/** Маршрут (без префикса локали), который должен открыть пользователь данной роли по умолчанию. */
export function defaultRouteForRole(role: string): string {
  return isAdminRole(role) ? '/admin' : '/dashboard'
}

/** True, если роль входит в admin-иерархию. */
export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as ReadonlyArray<string>).includes(role)
}

/** Проверка иерархии ролей: role >= minRole. */
export function hasAtLeastRole(role: string | null | undefined, minRole: AppRole): boolean {
  if (!role) return false
  if (!(role in ROLE_RANK)) return false
  return ROLE_RANK[role as AppRole] >= ROLE_RANK[minRole]
}

/**
 * Может ли пользователь с данной ролью получить доступ к маршруту (без префикса локали).
 * - Admin-маршруты `/admin/*` — только для admin-ролей.
 * - User-маршруты `/dashboard/*` — только для не-админов.
 * - Остальное (публичные страницы, /auth, /admin-auth) — всем.
 */
export function canAccessPath(role: string | null | undefined, pathWithoutLang: string): boolean {
  const path = pathWithoutLang.toLowerCase()
  const isAdmin = isAdminRole(role)

  if (path === '/admin' || path.startsWith('/admin/')) return isAdmin
  if (path === '/dashboard' || path.startsWith('/dashboard/')) return !isAdmin
  return true
}

/** Удалить префикс /ru, /en, /kz из pathname. */
export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(ru|en|kz)(?=\/|$)/, '') || '/'
}
