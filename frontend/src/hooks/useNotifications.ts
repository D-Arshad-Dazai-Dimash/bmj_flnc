'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { HubConnection } from '@microsoft/signalr'
import { createConnection } from '@/lib/signalr'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

/** Машинный тип события, известный фронту. Без supabase. */
export type NotificationType =
  | 'contract_signed'
  | 'contract_signature_partial'
  | 'payment_funded'
  | 'work_released'
  | string

export interface AppNotification {
  id:          string
  type:        NotificationType
  title:       string
  payloadJson?: string | null
  payload?:    unknown
  isRead:      boolean
  createdAt:   string
}

interface ListResponse {
  items: Array<{
    id:          string
    type:        string
    title:       string
    payloadJson: string | null
    isRead:      boolean
    createdAt:   string
  }>
  unreadCount: number
}

/**
 * Лента уведомлений + realtime через NotificationsHub.
 * Безопасна к множественной инициализации (соединение хранится в ref).
 */
export function useNotifications() {
  const [items, setItems]             = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading]         = useState(false)
  const connRef = useRef<HubConnection | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${BASE_URL}/api/notifications`, { credentials: 'include' })
      if (!r.ok) return
      const data = await r.json() as ListResponse
      setItems(data.items.map(i => ({ ...i, payload: undefined })))
      setUnreadCount(data.unreadCount)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let cancelled = false
    reload()

    ;(async () => {
      try {
        const conn = await createConnection('/hubs/notifications')
        if (cancelled) { await conn.stop(); return }
        connRef.current = conn

        conn.on('notification', (n: AppNotification) => {
          setItems(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev])
          if (!n.isRead) setUnreadCount(c => c + 1)
        })
      } catch { /* offline */ }
    })()

    return () => {
      cancelled = true
      const c = connRef.current
      if (c) { c.stop().catch(() => {}); connRef.current = null }
    }
  }, [reload])

  const markRead = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map(id =>
      fetch(`${BASE_URL}/api/notifications/${id}/read`, { method: 'POST', credentials: 'include' })
    ))
    setItems(prev => prev.map(n => ids.includes(n.id) ? { ...n, isRead: true } : n))
    setUnreadCount(c => Math.max(0, c - ids.length))
  }, [])

  const markAllRead = useCallback(async () => {
    await fetch(`${BASE_URL}/api/notifications/read-all`, { method: 'POST', credentials: 'include' })
    setItems(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }, [])

  return { items, loading, unreadCount, markRead, markAllRead, reload }
}
