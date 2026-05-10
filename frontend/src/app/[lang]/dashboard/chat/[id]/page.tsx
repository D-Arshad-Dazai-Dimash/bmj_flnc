'use client'

import { use, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import LocaleLink from '@/components/ui/LocaleLink'
import { BackButton } from '@/components/ui/back-button'
import {
  getMessages,
  listThreadsFor,
  markRead,
  sendMessage,
  type ChatMessage,
  type ChatThreadMeta,
} from '@/lib/chatStore'
import { DEFAULT_AVATAR_URL } from '@/lib/avatar'

export default function ChatThreadPage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>
}) {
  const { id: rawId } = use(params)
  const threadId = decodeURIComponent(rawId)
  const { user } = useAuth()
  const meId = user?.profileId ?? null

  const [meta, setMeta] = useState<ChatThreadMeta | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const [threads, msgs] = await Promise.all([
        listThreadsFor(meId),
        getMessages(threadId),
      ])
      if (cancelled) return
      setMeta(threads.find(t => t.id === threadId) ?? null)
      setMessages(msgs)
      setLoaded(true)
    }
    tick()
    const t = setInterval(tick, 3000)
    return () => { cancelled = true; clearInterval(t) }
  }, [threadId, meId])

  useEffect(() => {
    if (loaded && meta) void markRead(threadId)
  }, [threadId, loaded, meta, messages.length])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])

  const otherId = meta?.otherProfileId ?? null
  const otherName = meta?.otherProfileName ?? 'Диалог'

  async function handleSend() {
    const t = text.trim()
    if (!t || !meta) return
    setText('')
    await sendMessage({ threadId, text: t, projectId: meta.projectId ?? null })
    const msgs = await getMessages(threadId)
    setMessages(msgs)
  }

  if (loaded && !meta) {
    return (
      <div className="space-y-4">
        <BackButton fallbackHref="/dashboard/chat" />
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center text-sm text-text-muted">
          Диалог не найден.
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex h-[calc(100vh-7rem)] flex-col gap-3"
    >
      <header className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <LocaleLink
            href="/dashboard/chat"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-bg-hover hover:text-text-base"
          >
            <ArrowLeft className="h-4 w-4" />
          </LocaleLink>
          <div className="h-9 w-9 overflow-hidden rounded-full border border-border bg-bg-elevated">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={meta?.otherProfileLogoUrl ?? DEFAULT_AVATAR_URL} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-base">{otherName}</p>
            {meta?.projectTitle && (
              <p className="truncate text-[11px] text-text-faint">по проекту «{meta.projectTitle}»</p>
            )}
          </div>
        </div>
        {otherId && (
          <LocaleLink
            href={`/profiles/${otherId}`}
            className="text-xs text-text-muted underline-offset-4 hover:text-text-base hover:underline"
          >
            Профиль →
          </LocaleLink>
        )}
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-border bg-bg-card p-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles className="mb-2 h-6 w-6 text-text-faint" />
            <p className="text-sm text-text-muted">Начните разговор — отправьте первое сообщение.</p>
          </div>
        ) : (
          messages.map(m => {
            const own = m.fromProfileId === meId
            return (
              <div
                key={m.id}
                className={`flex ${own ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm ${
                    m.system
                      ? 'border border-amber-400/30 bg-amber-400/10 text-amber-100'
                      : own
                      ? 'bg-[#7170ff] text-white'
                      : 'border border-border bg-bg-elevated text-text-base'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`mt-1 text-[10px] ${own ? 'text-white/65' : 'text-text-faint'}`}>
                    {new Date(m.createdAt).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="flex items-end gap-2 rounded-xl border border-border bg-bg-card p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          rows={2}
          placeholder="Написать сообщение… (Shift+Enter — новая строка)"
          className="min-h-[44px] flex-1 resize-none rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-base placeholder:text-text-faint focus:border-white/30 focus:outline-none"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!text.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          Отправить
        </button>
      </div>
    </motion.div>
  )
}
