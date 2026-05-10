/**
 * Chat store — обёртка над API /api/chat/*.
 *
 * Бэкенд (C# / EF Core) хранит сущности ChatThread/ChatMessage в Postgres.
 * См. backend/Barnamaj.API/Entities/ChatThread.cs.
 *
 * Все функции — асинхронные и идемпотентные для UI:
 *  - сетевые ошибки молча возвращают пустые значения, чтобы UI не падал.
 */

import { api, type ChatThreadDto, type ChatMessageDto } from './api'

// ── Public UI-типы ────────────────────────────────────────────────

export interface ChatThreadMeta {
  /** Guid треда. */
  id: string
  /** Profile id собеседника. */
  otherProfileId: string
  otherProfileName: string
  otherProfileLogoUrl: string | null
  lastMessage?: string
  lastAt?: string
  hasUnread: boolean
  projectId?: string | null
  projectTitle?: string | null
}

export interface ChatMessage {
  id: string
  threadId: string
  fromProfileId: string
  fromProfileName: string
  text: string
  createdAt: string
  system?: boolean
  projectId?: string | null
}

// ── Mappers ───────────────────────────────────────────────────────

function toMeta(t: ChatThreadDto): ChatThreadMeta {
  return {
    id: t.id,
    otherProfileId: t.otherProfileId,
    otherProfileName: t.otherProfileName,
    otherProfileLogoUrl: t.otherProfileLogoUrl,
    lastMessage: t.lastMessageBody ?? undefined,
    lastAt: t.updatedAt,
    hasUnread: t.hasUnread,
    projectId: t.projectId,
    projectTitle: t.projectTitle,
  }
}

function toMessage(m: ChatMessageDto): ChatMessage {
  return {
    id: m.id,
    threadId: m.threadId,
    fromProfileId: m.senderProfileId,
    fromProfileName: m.senderProfileName,
    text: m.body,
    createdAt: m.createdAt,
    system: m.isSystem,
    projectId: m.projectId,
  }
}

// ── Public API (async) ────────────────────────────────────────────

/** Список тредов текущего пользователя. */
export async function listThreadsFor(_myProfileId?: string | null): Promise<ChatThreadMeta[]> {
  try {
    const dtos = await api.chat.listThreads()
    return dtos.map(toMeta)
  } catch { return [] }
}

/** Открыть/создать тред с другим профилем (опционально привязан к проекту). */
export async function ensureThread(
  otherProfileId: string,
  projectId?: string | null,
): Promise<ChatThreadMeta | null> {
  try {
    const dto = await api.chat.start({ otherProfileId, projectId: projectId ?? null })
    return toMeta(dto)
  } catch { return null }
}

/** Сообщения в треде. */
export async function getMessages(threadId: string): Promise<ChatMessage[]> {
  try {
    const msgs = await api.chat.getMessages(threadId)
    return msgs.map(toMessage)
  } catch { return [] }
}

/** Отправить сообщение. */
export async function sendMessage(input: {
  threadId: string
  text: string
  projectId?: string | null
}): Promise<ChatMessage | null> {
  try {
    const m = await api.chat.sendMessage(input.threadId, input.text, input.projectId ?? null)
    return toMessage(m)
  } catch { return null }
}

/** Пометить тред прочитанным. */
export async function markRead(threadId: string): Promise<void> {
  try { await api.chat.markRead(threadId) } catch { /* ignore */ }
}

/** Общее количество непрочитанных тредов. */
export async function unreadCountFor(_profileId?: string | null): Promise<number> {
  try {
    const r = await api.chat.unreadCount()
    return r.count
  } catch { return 0 }
}
