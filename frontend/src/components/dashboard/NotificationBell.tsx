'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

const TYPE_ICON: Record<string, string> = {
  contract_signed:            '✍️',
  contract_signature_partial: '🖊️',
  payment_funded:             '💰',
  work_released:              '✅',
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - d) / 1000
  if (diff < 60)    return 'только что'
  if (diff < 3600)  return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  return new Date(iso).toLocaleDateString('ru-RU')
}

const Row = memo(function Row({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const icon = TYPE_ICON[n.type] ?? 'ℹ️'
  return (
    <div className={cn(
      'group flex gap-3 rounded-xl border p-3 transition-colors',
      n.isRead ? 'border-border/50 opacity-60' : 'border-accent/30 bg-accent/5'
    )}>
      <span className="text-lg shrink-0 select-none">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-tight', n.isRead ? 'text-text-faint' : 'text-text-base font-medium')}>
          {n.title}
        </p>
        <span className="text-[11px] text-text-faint">{timeAgo(n.createdAt)}</span>
      </div>
      {!n.isRead && (
        <button
          onClick={() => onRead(n.id)}
          title="Прочитано"
          className="shrink-0 p-1 rounded-md text-text-faint hover:text-accent hover:bg-accent/10 opacity-0 group-hover:opacity-100"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
})

export default function NotificationBell() {
  const { items, unreadCount, markRead, markAllRead, loading } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className={cn(
          'relative p-2 rounded-xl transition-colors',
          open ? 'bg-accent/15 text-accent-light' : 'text-text-faint hover:text-text-base hover:bg-bg-hover'
        )}
        title="Уведомления"
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-lg shadow-red-500/30"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] w-[360px] max-h-[480px] rounded-2xl border border-border bg-bg-surface shadow-2xl shadow-black/40 overflow-hidden z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-base">Уведомления</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-accent-light hover:text-accent">
                  <CheckCheck className="w-3.5 h-3.5" /> Прочитать все
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
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
                items.map(n => <Row key={n.id} n={n} onRead={(id) => markRead([id])} />)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
