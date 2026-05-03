'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const t = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? t : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' ' + t
}

export default function ChatBox({ contractId }: { contractId: string }) {
  const { user }    = useAuth()
  const myProfileId = user?.profileId ?? null

  const { messages, loading, sending, sendMessage, error } = useChat(contractId)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    await sendMessage(text)
    setText('')
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-card flex flex-col" style={{ height: 520 }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <MessageSquare className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-text-base">Чат по контракту</h3>
        <span className="ml-auto text-[10px] font-mono text-text-faint tracking-widest border border-border rounded-full px-2 py-0.5">
          REALTIME
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
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
          messages.map(m => {
            const isOwn = myProfileId && m.senderProfileId === myProfileId
            return (
              <div key={m.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
                  isOwn
                    ? 'bg-accent/20 text-text-base rounded-tr-sm'
                    : 'bg-bg-surface border border-border text-text-base rounded-tl-sm'
                )}>
                  <div>{m.body}</div>
                  <div className={cn('text-[10px] text-text-faint mt-1', isOwn ? 'text-right' : 'text-left')}>
                    {fmtTime(m.createdAt)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {error && <div className="px-4 py-2 text-xs text-red-400 border-t border-border">{error}</div>}

      <div className="border-t border-border p-3 flex items-end gap-2 shrink-0">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder="Написать сообщение…"
          className="flex-1 resize-none bg-bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent/60 max-h-32"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="shrink-0 p-2 rounded-xl bg-accent/20 text-accent-light hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Отправить (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
