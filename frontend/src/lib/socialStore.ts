/**
 * MVP-хранилище соцфункций (лайки заказов, посты профилей) на основе localStorage.
 *
 * NB: backend-сущности `ProjectLike` и `ProfilePost` пока не реализованы
 * (см. DECISION_NEEDED.md). Это локальный shim, который привязан к userId,
 * чтобы на одном устройстве данные сохранялись между сессиями.
 */

const LIKES_KEY = 'bj.likes.v1'         // { [userId]: string[] (projectIds) }
const POSTS_KEY = 'bj.posts.v1'         // { [profileId]: ProfilePost[] }

// ── Likes ──────────────────────────────────────────────────────────

function readLikes(): Record<string, string[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LIKES_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function writeLikes(map: Record<string, string[]>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LIKES_KEY, JSON.stringify(map))
  } catch {
    /* quota exceeded — игнорируем */
  }
}

export function getLikedIds(userId: string | null | undefined): Set<string> {
  if (!userId) return new Set()
  const map = readLikes()
  return new Set(map[userId] ?? [])
}

export function toggleLike(userId: string, projectId: string): boolean {
  const map = readLikes()
  const current = new Set(map[userId] ?? [])
  let liked: boolean
  if (current.has(projectId)) {
    current.delete(projectId)
    liked = false
  } else {
    current.add(projectId)
    liked = true
  }
  map[userId] = Array.from(current)
  writeLikes(map)
  return liked
}

// ── Posts ──────────────────────────────────────────────────────────

export interface ProfilePost {
  id: string
  profileId: string
  authorUserId: string
  text: string
  createdAt: string
}

function readPosts(): Record<string, ProfilePost[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(POSTS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ProfilePost[]>) : {}
  } catch {
    return {}
  }
}

function writePosts(map: Record<string, ProfilePost[]>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(POSTS_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function getProfilePosts(profileId: string): ProfilePost[] {
  const map = readPosts()
  return (map[profileId] ?? []).slice().sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  )
}

export function addProfilePost(
  profileId: string,
  authorUserId: string,
  text: string,
): ProfilePost {
  const post: ProfilePost = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    profileId,
    authorUserId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  }
  const map = readPosts()
  map[profileId] = [post, ...(map[profileId] ?? [])]
  writePosts(map)
  return post
}

export function deleteProfilePost(profileId: string, postId: string) {
  const map = readPosts()
  map[profileId] = (map[profileId] ?? []).filter((p) => p.id !== postId)
  writePosts(map)
}
