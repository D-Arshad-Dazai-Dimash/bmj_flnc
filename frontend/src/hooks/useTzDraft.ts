import { useState, useEffect, useCallback, useRef } from 'react'

export interface TzDraft {
  title: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  savedAt: number
}

const STORAGE_KEY = 'barnamaj:tz_draft'
const AUTOSAVE_INTERVAL = 30_000  // 30 сек

/**
 * useTzDraft — автосохранение черновика ТЗ в localStorage.
 *
 * Возвращает:
 * - draft: текущий черновик (или null если нет)
 * - saveDraft: явно сохранить (вызывается из кнопки "Сохранить черновик")
 * - clearDraft: удалить черновик (после успешного экспорта)
 * - hasDraft: есть ли незавершённый черновик (для показа модала восстановления)
 */
export function useTzDraft(
  title: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  const [savedDraft, setSavedDraft] = useState<TzDraft | null>(null)
  const [hasDraft, setHasDraft] = useState(false)

  // Загрузить существующий черновик при маунте
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as TzDraft
        // Показываем только если черновик не пустой
        if (parsed.messages.length > 0 || parsed.title) {
          setSavedDraft(parsed)
          setHasDraft(true)
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const saveDraft = useCallback(() => {
    if (messages.length === 0 && !title) return
    const draft: TzDraft = { title, messages, savedAt: Date.now() }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
      setSavedDraft(draft)
    } catch { /* quota exceeded */ }
  }, [title, messages])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSavedDraft(null)
    setHasDraft(false)
  }, [])

  // Автосохранение каждые 30 сек если есть содержимое
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (messages.length > 0 || title) saveDraft()
    }, AUTOSAVE_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [saveDraft, messages.length, title])

  return { savedDraft, hasDraft, saveDraft, clearDraft }
}
