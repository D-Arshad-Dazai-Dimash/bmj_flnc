/**
 * Аватары: централизованный фолбэк, пока пользователь не загрузил свой.
 *
 * MVP: один общий дефолтный аватар (статика в `public/`).
 * Когда профиль установит `logoUrl` через /dashboard/settings — он
 * автоматически вытесняет дефолт.
 */

export const DEFAULT_AVATAR_URL = '/default-avatar.jpg'

/** Вернуть src для тега <img>. Пустые/`null`/`undefined` → дефолт. */
export function avatarSrc(url?: string | null): string {
  const trimmed = (url ?? '').trim()
  return trimmed || DEFAULT_AVATAR_URL
}
