/**
 * projectDrafts — локальное MVP-хранилище черновиков заказа
 * (форма со страницы /dashboard/create-project).
 *
 * Хранится только в браузере. Бекенд не задействован — приватные
 * черновики у каждого устройства свои. Когда появится поддержка на
 * сервере (см. DECISION_NEEDED.md), функции этого модуля можно
 * заменить на API-вызовы, не трогая UI.
 */

import type { OrderType } from '@/lib/database.types'

export interface ProjectDraft {
  id:          string
  type:        OrderType | null
  title:       string
  description: string
  budget:      string  // строкой, как в форме
  deadline:    string  // YYYY-MM-DD
  extras:      Record<string, string>
  /** ISO-дата запланированной публикации (для будущей фичи). */
  scheduledAt?: string | null
  savedAt:     number
}

const STORAGE_KEY = 'bj.project_drafts.v1'

function readAll(): ProjectDraft[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValid)
  } catch {
    return []
  }
}

function writeAll(items: ProjectDraft[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { /* quota */ }
}

function isValid(x: unknown): x is ProjectDraft {
  if (!x || typeof x !== 'object') return false
  const d = x as Record<string, unknown>
  return typeof d.id === 'string' && typeof d.savedAt === 'number'
}

function genId(): string {
  return 'pd_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Список всех черновиков, новые сверху. */
export function listProjectDrafts(): ProjectDraft[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt)
}

export function getProjectDraft(id: string): ProjectDraft | null {
  return readAll().find(d => d.id === id) ?? null
}

export function deleteProjectDraft(id: string): void {
  writeAll(readAll().filter(d => d.id !== id))
}

/**
 * Сохранить черновик. Если `id` не передан — создаётся новый.
 * Возвращает итоговый id (новый или переданный).
 */
export function saveProjectDraft(
  data: Omit<ProjectDraft, 'id' | 'savedAt'> & { id?: string | null },
): ProjectDraft {
  const all = readAll()
  const id = data.id ?? genId()
  const draft: ProjectDraft = {
    id,
    type:        data.type,
    title:       data.title,
    description: data.description,
    budget:      data.budget,
    deadline:    data.deadline,
    extras:      data.extras,
    scheduledAt: data.scheduledAt ?? null,
    savedAt:     Date.now(),
  }
  const idx = all.findIndex(d => d.id === id)
  if (idx >= 0) all[idx] = draft
  else all.push(draft)
  writeAll(all)
  return draft
}

/** Запланировать публикацию (только сохраняет дату, бекенд не вызывает). */
export function scheduleProjectDraft(id: string, when: string | null): ProjectDraft | null {
  const all = readAll()
  const idx = all.findIndex(d => d.id === id)
  if (idx < 0) return null
  all[idx] = { ...all[idx], scheduledAt: when, savedAt: Date.now() }
  writeAll(all)
  return all[idx]
}

/** Превью названия для списка. */
export function projectDraftPreviewTitle(d: ProjectDraft): string {
  if (d.title.trim()) return d.title.trim()
  if (d.description.trim()) return d.description.trim().slice(0, 60)
  return 'Черновик без названия'
}
