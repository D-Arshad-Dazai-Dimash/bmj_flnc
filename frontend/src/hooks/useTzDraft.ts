import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * useTzDraft — управление списком черновиков ТЗ в localStorage.
 *
 * Все черновики хранятся в одном массиве под ключом `STORAGE_KEY`.
 * У каждого свой `id`. Визард передаёт текущий `draftId` (или `null`
 * для нового сеанса). При первом `saveDraft()` без id генерируется новый.
 *
 * Утилиты `listDrafts` / `removeDraft` / `getDraft` используются панелью
 * "Черновики (N)" на странице создания заказа.
 */

export interface TzMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface TzDraft {
  id:       string
  title:    string
  messages: TzMessage[]
  savedAt:  number
}

const STORAGE_KEY        = 'barnamaj:tz_drafts'
const LEGACY_KEY         = 'barnamaj:tz_draft'   // одиночный черновик старого формата
const AUTOSAVE_INTERVAL  = 30_000                // 30 сек

// ──────────────────────────────────────────────────────────────────────────────
// Утилиты (без React)

function readAll(): TzDraft[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr.filter(isValidDraft)
    }
  } catch { /* ignore */ }
  // Миграция со старого формата: один объект без id
  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY)
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw)
      if (legacy && Array.isArray(legacy.messages)) {
        const migrated: TzDraft = {
          id:       genId(),
          title:    String(legacy.title ?? ''),
          messages: legacy.messages,
          savedAt:  Number(legacy.savedAt) || Date.now(),
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify([migrated]))
        localStorage.removeItem(LEGACY_KEY)
        return [migrated]
      }
    }
  } catch { /* ignore */ }
  return []
}

function writeAll(drafts: TzDraft[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts)) } catch { /* quota */ }
}

function isValidDraft(x: unknown): x is TzDraft {
  if (!x || typeof x !== 'object') return false
  const d = x as Record<string, unknown>
  return typeof d.id === 'string' && typeof d.savedAt === 'number' && Array.isArray(d.messages)
}

function genId(): string {
  return 'd_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Список всех черновиков, новые сверху. */
export function listDrafts(): TzDraft[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt)
}

export function removeDraft(id: string) {
  writeAll(readAll().filter(d => d.id !== id))
}

export function getDraft(id: string): TzDraft | null {
  return readAll().find(d => d.id === id) ?? null
}

/** Удобный заголовок для отображения (по полю title или первой реплике юзера). */
export function draftPreviewTitle(d: TzDraft): string {
  if (d.title.trim()) return d.title.trim()
  const first = d.messages.find(m => m.role === 'user')
  if (first) return first.content.slice(0, 60)
  return 'Без названия'
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook

interface UseTzDraftResult {
  /** Текущий draftId (после первого автосохранения, если изначально null). */
  currentId:   string | null
  /** Сколько других черновиков сохранено (не считая текущего). */
  otherCount:  number
  /** Сохранить сейчас (явно). Возвращает id записи или null если нечего. */
  saveDraft:   () => string | null
  /** Удалить текущий черновик и сбросить currentId. */
  clearDraft:  () => void
}

/**
 * @param draftId      идентификатор открытого черновика (null = новый сеанс)
 * @param title        заголовок (можно строить из первого сообщения)
 * @param messages     текущие сообщения
 * @param onIdAssigned колбэк когда новой записи присвоен id
 */
export function useTzDraft(
  draftId:        string | null,
  title:          string,
  messages:       TzMessage[],
  onIdAssigned?:  (id: string) => void,
): UseTzDraftResult {
  const [currentId, setCurrentId] = useState<string | null>(draftId)
  const [otherCount, setOtherCount] = useState(0)

  // Если родитель сменил draftId — синхронизируем
  useEffect(() => { setCurrentId(draftId) }, [draftId])

  const refreshCount = useCallback(() => {
    setOtherCount(readAll().filter(d => d.id !== currentId).length)
  }, [currentId])

  useEffect(() => { refreshCount() }, [refreshCount])

  const saveDraft = useCallback((): string | null => {
    const isMeaningful =
      title.trim().length > 0 ||
      messages.some(m => m.role === 'user' && m.content.trim().length > 0)
    if (!isMeaningful) return null

    const all = readAll()
    let id = currentId
    if (!id) {
      id = genId()
      setCurrentId(id)
      onIdAssigned?.(id)
    }
    const draft: TzDraft = { id, title, messages, savedAt: Date.now() }
    const idx = all.findIndex(d => d.id === id)
    if (idx >= 0) all[idx] = draft
    else all.push(draft)
    writeAll(all)
    refreshCount()
    return id
  }, [currentId, messages, onIdAssigned, refreshCount, title])

  const clearDraft = useCallback(() => {
    if (currentId) writeAll(readAll().filter(d => d.id !== currentId))
    setCurrentId(null)
    refreshCount()
  }, [currentId, refreshCount])

  // Автосохранение
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    timerRef.current = setInterval(() => { saveDraft() }, AUTOSAVE_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [saveDraft])

  return useMemo(
    () => ({ currentId, otherCount, saveDraft, clearDraft }),
    [currentId, otherCount, saveDraft, clearDraft],
  )
}
