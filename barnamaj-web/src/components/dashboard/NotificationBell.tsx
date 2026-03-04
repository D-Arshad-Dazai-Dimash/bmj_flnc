'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import type { Notification, NotificationType } from '@/lib/database.types'
import Link from '@/components/ui/LocaleLink'
import { cn } from '@/lib/utils'

// ── Type → color / icon map ─────────────────────────────────────────────────
const TYPE_STYLE: Record<NotificationType, { icon: string; accent: string }> = {
  new_application:      { icon: '📩', accent: 'border-amber-500/30 bg-amber-500/5' },
  application_accepted: { icon: '✅', accent: 'border-emerald-500/30 bg-emerald-500/5' },
  work_submitted:       { icon: '📦', accent: 'border-cyan-500/30 bg-cyan-500/5' },
  escrow_released:      { icon: '💰', accent: 'border-emerald-500/30 bg-emerald-500/5' },
  info:                 { icon: 'ℹ️', accent: 'border-border bg-bg-muted' },
}

// ── Single notification row ─────────────────────────────────────────────────
const NotificationRow = memo(function NotificationRow({
  n,
  onRead,
}: {
  n: Notification
  onRead: (id: string) => void
}) {
  const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.info

  const timeAgo = getTimeAgo(n.created_at)

  const content = (
    <div
      className={cn(
        'group relative flex gap-3 rounded-xl border p-3 transition-all duration-200',
        n.is_read
          ? 'border-border/50 bg-transparent opacity-60'
          : style.accent
      )}
    >
      {/* Icon */}
      <span className="text-lg shrink-0 mt-0.5 select-none">{style.icon}</span>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm leading-tight',
            n.is_read ? 'text-text-faint' : 'text-text-base font-medium'
          )}>
            {n.title}
          </p>
          {!n.is_read && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRead(n.id) }}
              title="Отметить как прочитанное"
              className="shrink-0 p-1 rounded-md text-text-faint hover:text-accent hover:bg-accent/10 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {n.message && (
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] text-text-faint">{timeAgo}</span>
          {n.link && (
            <span className="text-[11px] text-accent-light flex items-center gap-0.5">
              <ExternalLink className="w-2.5 h-2.5" /> Перейти
            </span>
          )}
        </div>
      </div>

      {/* Unread dot */}
      {!n.is_read && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-accent animate-pulse" />
      )}
    </div>
  )

  if (n.link) {
    return (
      <Link href={n.link} onClick={() => !n.is_read && onRead(n.id)}>
        {content}
      </Link>
    )
  }

  return content
})

// ── NotificationBell (колокольчик) ──────────────────────────────────────────
export default function NotificationBell() {
  const { items, unreadCount, markRead, markAllRead, loading } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const handleReadOne = (id: string) => markRead([id])

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'relative p-2 rounded-xl transition-all duration-200',
          open
            ? 'bg-accent/15 text-accent-light'
            : 'text-text-faint hover:text-text-base hover:bg-bg-hover'
        )}
        title="Уведомления"
      >
        <Bell className="w-5 h-5" />

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-lg shadow-red-500/30"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] w-[360px] max-h-[480px] rounded-2xl border border-border bg-bg-surface shadow-2xl shadow-black/40 overflow-hidden z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-base">Уведомления</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-accent-light hover:text-accent transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Прочитать все
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 space-y-1.5">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Bell className="w-8 h-8 mx-auto text-text-faint/40" />
                  <p className="text-sm text-text-faint">Нет уведомлений</p>
                </div>
              ) : (
                items.map(n => (
                  <NotificationRow key={n.id} n={n} onRead={handleReadOne} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Time ago helper ──────────────────────────────────────────────────────────
function getTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)

  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин. назад`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч. назад`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} дн. назад`

  return new Date(dateStr).toLocaleDateString('ru-RU')
}
