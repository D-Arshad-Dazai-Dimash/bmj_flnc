/**
 * MVP-shim: трекинг отправленных откликов для дедупликации UI.
 *
 * Backend пока не отдаёт список «куда я уже подавал заявку», поэтому
 * между сессиями храним собственные отклики локально, чтобы кнопка
 * «Откликнуться» сразу превращалась в «Вы уже откликнулись».
 *
 * При успехе `api.projects.apply(...)` нужно вызвать
 * `markApplied(userId, projectId)`.
 */

const KEY = 'bj.applied.v1' // { [userId]: { [projectId]: { coverLetter?, sentAt } } }

export interface AppliedRecord {
  coverLetter?: string
  proposedBudget?: number | null
  sentAt: string
}

type Bucket = Record<string, Record<string, AppliedRecord>>

function read(): Bucket {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Bucket) : {}
  } catch { return {} }
}

function write(b: Bucket): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* ignore */ }
}

export function getAppliedIds(userId: string | null | undefined): Set<string> {
  if (!userId) return new Set()
  const b = read()
  return new Set(Object.keys(b[userId] ?? {}))
}

export function isApplied(userId: string | null | undefined, projectId: string): boolean {
  if (!userId) return false
  return !!read()[userId]?.[projectId]
}

export function markApplied(
  userId: string,
  projectId: string,
  rec?: Omit<AppliedRecord, 'sentAt'>,
): void {
  const b = read()
  b[userId] ??= {}
  b[userId][projectId] = { ...rec, sentAt: new Date().toISOString() }
  write(b)
}

export function unmarkApplied(userId: string, projectId: string): void {
  const b = read()
  if (b[userId]) {
    delete b[userId][projectId]
    write(b)
  }
}
