'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import type { Notification, NotificationType } from '@/lib/database.types'

// ── Toast icon map ───────────────────────────────────────────────────────────
const TOAST_ICON: Record<NotificationType, string> = {
  new_application:      '📩',
  application_accepted: '✅',
  work_submitted:       '📦',
  escrow_released:      '💰',
  info:                 'ℹ️',
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useNotifications() {
  const { user }   = useAuth()
  const [items, setItems]     = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())

  const unreadCount = items.filter(n => !n.is_read).length

  // ── Initial fetch ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) { setLoading(false); return }

    const sb = supabaseRef.current
    let cancelled = false

    async function load() {
      const { data } = await sb
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!cancelled && data) {
        setItems(data as Notification[])
      }
      if (!cancelled) setLoading(false)
    }
    load()

    return () => { cancelled = true }
  }, [user?.id])

  // ── Realtime subscription ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return

    const sb = supabaseRef.current

    const channel = sb
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification
          setItems(prev => [n, ...prev])

          // 🔔 Toast
          toast(n.title, {
            description: n.message,
            icon: TOAST_ICON[n.type] ?? 'ℹ️',
            duration: 5000,
            action: n.link
              ? { label: 'Открыть', onClick: () => window.location.assign(n.link!) }
              : undefined,
          })
        }
      )
      .subscribe()

    return () => {
      sb.removeChannel(channel)
    }
  }, [user?.id])

  // ── Mark read ──────────────────────────────────────────────
  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return

    // optimistic
    setItems(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n)
    )

    await supabaseRef.current.rpc('mark_notifications_read', {
      p_ids: ids,
    })
  }, [])

  // ── Mark all read ──────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))

    await supabaseRef.current.rpc('mark_all_notifications_read')
  }, [])

  return { items, loading, unreadCount, markRead, markAllRead }
}
