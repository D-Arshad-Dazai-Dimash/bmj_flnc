'use client'

import { memo, useEffect, useRef, useState, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, CornerDownRight, MessageSquare } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/context/AuthContext'
import type { MessageWithSender } from '@/lib/database.types'
import { cn } from '@/lib/utils'

// ── Time formatter ────────────────────────────────────────────────────────────
function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()

  const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return timeStr
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' ' + timeStr
}

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'xs' }) {
  const initial = (name?.[0] ?? '?').toUpperCase()
  return (
    <div className={cn(
      'rounded-full bg-accent/20 text-accent-light font-bold flex items-center justify-center shrink-0 select-none',
      size === 'sm' ? 'w-7 h-7 text-xs' : 'w-5 h-5 text-[10px]'
    )}>
      {initial}
    </div>
  )
}

// ── Reply preview bar ─────────────────────────────────────────────────────────
const ReplyBar = memo(function ReplyBar({
  msg,
  onCancel,
}: {
  msg: MessageWithSender
  onCancel: () => void
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-2 px-3 py-2 border-t border-border bg-bg-surface"
      >
        <CornerDownRight className="w-3.5 h-3.5 text-accent-light shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-accent-light font-medium truncate">{msg.sender?.full_name}</p>
          <p className="text-xs text-text-faint truncate">{msg.text}</p>
        </div>
        <button
          onClick={onCancel}
          className="p-1 rounded-md text-text-faint hover:text-text-base hover:bg-bg-hover transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
})

// ── Single message bubble ─────────────────────────────────────────────────────
const MessageBubble = memo(function MessageBubble({
  msg,
  isOwn,
  onReply,
}: {
  msg: MessageWithSender
  isOwn: boolean
  onReply: (msg: MessageWithSender) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-2 group', isOwn ? 'flex-row-reverse' : 'flex-row')}
    >
      {!isOwn && <Avatar name={msg.sender?.full_name ?? '?'} />}

      <div className={cn('max-w-[75%] space-y-1', isOwn && 'items-end flex flex-col')}>
        {/* Sender name + time */}
        {!isOwn && (
          <p className="text-[11px] text-text-faint px-1">
            {msg.sender?.full_name}
          </p>
        )}

        {/* Reply quote */}
        {msg.reply_to && (
          <div className={cn(
            'flex items-start gap-1.5 px-2 py-1 rounded-lg border-l-2 bg-bg-surface/50',
            isOwn
              ? 'border-accent/50 flex-row-reverse border-r-2 border-l-0 text-right'
              : 'border-accent/50'
          )}>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-accent-light truncate">
                {msg.reply_to.sender?.full_name}
              </p>
              <p className="text-[10px] text-text-faint truncate max-w-[180px]">
                {msg.reply_to.text}
              </p>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div className={cn(
          'relative px-3 py-2 rounded-2xl text-sm leading-relaxed',
          isOwn
            ? 'bg-accent/20 text-text-base rounded-tr-sm'
            : 'bg-bg-surface border border-border text-text-base rounded-tl-sm'
        )}>
          {msg.text}

          {/* Timestamp + reply button */}
          <div className={cn(
            'flex items-center gap-1.5 mt-0.5',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className="text-[10px] text-text-faint">{fmtTime(msg.created_at)}</span>
            <button
              onClick={() => onReply(msg)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-text-faint hover:text-accent-light"
              title="Ответить"
            >
              <CornerDownRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
})

// ── Main ChatBox ──────────────────────────────────────────────────────────────
export default function ChatBox({ contractId }: { contractId: string }) {
  const { user } = useAuth()
  const { messages, loading, sending, sendMessage, replyTo, setReplyTo } = useChat(contractId)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    await sendMessage(text, replyTo?.id)
    setText('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-card flex flex-col" style={{ height: '520px' }}>
      {/* Ornamental top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <MessageSquare className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-text-base">Чат по контракту</h3>
        <span className="ml-auto text-[10px] font-mono text-text-faint tracking-widest border border-border rounded-full px-2 py-0.5">
          REALTIME
        </span>
      </div>

      {/* Messages list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3"
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-12">
            <MessageSquare className="w-8 h-8 text-text-faint/40" />
            <p className="text-sm text-text-faint">Начните переписку</p>
            <p className="text-xs text-text-faint/60">Сообщения видны только участникам контракта</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.sender_id === user?.id}
              onReply={setReplyTo}
            />
          ))
        )}
      </div>

      {/* Reply bar */}
      {replyTo && (
        <ReplyBar msg={replyTo} onCancel={() => setReplyTo(null)} />
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border p-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишите сообщение… (Enter — отправить, Shift+Enter — новая строка)"
          rows={1}
          className={cn(
            'flex-1 resize-none bg-bg-surface border border-border rounded-xl px-3 py-2',
            'text-sm text-text-base placeholder:text-text-faint',
            'focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30',
            'transition-all max-h-32 overflow-y-auto'
          )}
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className={cn(
            'p-2.5 rounded-xl transition-all duration-200',
            text.trim() && !sending
              ? 'bg-accent text-white hover:bg-accent/80 shadow-lg shadow-accent/20'
              : 'bg-bg-surface text-text-faint cursor-not-allowed'
          )}
        >
          {sending
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </div>
    </div>
  )
}
