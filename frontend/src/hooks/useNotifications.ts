'use client'

// TODO (Неделя 1): Реализовать уведомления через SignalR (NotificationsHub)
// Временная заглушка — пустое состояние, не ломает сборку

import { useCallback } from 'react'

import type { NotificationType } from '@/lib/database.types'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  link?: string | null
  created_at: string
}

export function useNotifications() {
  const markRead    = useCallback(async (_ids: string[]) => {}, [])
  const markAllRead = useCallback(async () => {}, [])

  return {
    items:       [] as Notification[],
    loading:     false,
    unreadCount: 0,
    markRead,
    markAllRead,
  }
}
