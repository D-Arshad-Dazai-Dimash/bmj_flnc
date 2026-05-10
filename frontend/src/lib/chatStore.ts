/**
 * MVP-чат на localStorage.
 *
 * Бекенд (C# / EF Core) пока не содержит сущность сообщений
 * (см. STACK_LOCK). Это локальный shim, чтобы UX чата работал
 * end-to-end в одном браузере. Когда появится реальный backend —
 * замените реализацию методов, не трогая компоненты.
 *
 * Модель:
 *   • Тред идентифицируется парой profileId, отсортированной
 *     лексикографически: `${a}::${b}` — гарантирует один тред на
 *     пару, кто бы ни писал первым.
 *   • Сообщение принадлежит автору-профилю.
 */

const THREADS_KEY  = 'bj.chat.threads.v1'   // ChatThreadMeta[]
const MESSAGES_KEY = 'bj.chat.messages.v1'  // { [threadId]: ChatMessage[] }

export interface ChatThreadMeta {
  id:           string             // 'a::b'
  participants: [string, string]   // profileIds
  participantNames: Record<string, string>
  lastMessage?: string
  lastAt?:      string
  /** ISO-время последнего прочтения каждым участником */
  readAt?: Record<string, string>
}

export interface ChatMessage {
  id:        string
  threadId:  string
  fromProfileId: string
  text:      string
  createdAt: string
  /** Системное (приглашение к работе, оффер, статус) */
  system?:   boolean
  /** Опциональная привязка к проекту (предложения / отклики) */
  projectId?: string
}

// ── helpers ────────────────────────────────────────────────────────

function readThreads(): ChatThreadMeta[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(THREADS_KEY)
    const arr = raw ? (JSON.parse(raw) as ChatThreadMeta[]) : []
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function writeThreads(arr: ChatThreadMeta[]): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(THREADS_KEY, JSON.stringify(arr)) } catch { /* ignore */ }
}

function readMessages(): Record<string, ChatMessage[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(MESSAGES_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {}
  } catch { return {} }
}

function writeMessages(m: Record<string, ChatMessage[]>): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(m)) } catch { /* ignore */ }
}

export function threadIdFor(a: string, b: string): string {
  return [a, b].sort().join('::')
}

// ── public API ────────────────────────────────────────────────────

/** Все треды, в которых участвует profileId. Отсортированы по lastAt desc. */
export function listThreadsFor(profileId: string | null | undefined): ChatThreadMeta[] {
  if (!profileId) return []
  return readThreads()
    .filter(t => t.participants.includes(profileId))
    .sort((x, y) => (y.lastAt ?? '').localeCompare(x.lastAt ?? ''))
}

export function getThread(threadId: string): ChatThreadMeta | null {
  return readThreads().find(t => t.id === threadId) ?? null
}

/**
 * Гарантирует существование треда между двумя профилями. Возвращает meta.
 * Если треда нет — создаёт.
 */
export function ensureThread(
  meId: string,
  meName: string,
  otherId: string,
  otherName: string,
): ChatThreadMeta {
  const id = threadIdFor(meId, otherId)
  const all = readThreads()
  const existing = all.find(t => t.id === id)
  if (existing) {
    // обновим имена, если поменялись
    existing.participantNames = { ...existing.participantNames, [meId]: meName, [otherId]: otherName }
    writeThreads(all)
    return existing
  }
  const meta: ChatThreadMeta = {
    id,
    participants: [meId, otherId],
    participantNames: { [meId]: meName, [otherId]: otherName },
  }
  all.push(meta)
  writeThreads(all)
  return meta
}

export function getMessages(threadId: string): ChatMessage[] {
  return (readMessages()[threadId] ?? [])
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function sendMessage(input: {
  threadId:      string
  fromProfileId: string
  text:          string
  system?:       boolean
  projectId?:    string
}): ChatMessage {
  const msg: ChatMessage = {
    id:            'm_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    threadId:      input.threadId,
    fromProfileId: input.fromProfileId,
    text:          input.text.trim(),
    createdAt:     new Date().toISOString(),
    system:        input.system,
    projectId:     input.projectId,
  }
  const map = readMessages()
  map[input.threadId] = [...(map[input.threadId] ?? []), msg]
  writeMessages(map)

  // обновим мету треда
  const threads = readThreads()
  const meta = threads.find(t => t.id === input.threadId)
  if (meta) {
    meta.lastMessage = msg.text
    meta.lastAt = msg.createdAt
    meta.readAt = { ...(meta.readAt ?? {}), [input.fromProfileId]: msg.createdAt }
    writeThreads(threads)
  }
  return msg
}

export function markRead(threadId: string, profileId: string): void {
  const all = readThreads()
  const m = all.find(t => t.id === threadId)
  if (!m) return
  m.readAt = { ...(m.readAt ?? {}), [profileId]: new Date().toISOString() }
  writeThreads(all)
}

export function unreadCountFor(profileId: string | null | undefined): number {
  if (!profileId) return 0
  const threads = listThreadsFor(profileId)
  let n = 0
  for (const t of threads) {
    const lastRead = t.readAt?.[profileId]
    if (t.lastAt && (!lastRead || t.lastAt > lastRead)) n++
  }
  return n
}
