'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import LocaleLink from '@/components/ui/LocaleLink'
import { listThreadsFor, type ChatThreadMeta } from '@/lib/chatStore'
import { DEFAULT_AVATAR_URL } from '@/lib/avatar'

export default function ChatListPage() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<ChatThreadMeta[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!user?.profileId) return
    const tick = () => setThreads(listThreadsFor(user.profileId))
    tick()
    const t = setInterval(tick, 3000)
    const onStorage = () => tick()
    window.addEventListener('storage', onStorage)
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage) }
  }, [user?.profileId])

  const filtered = useMemo(() => {
    if (!q.trim()) return threads
    const needle = q.trim().toLowerCase()
    return threads.filter(t =>
      Object.values(t.participantNames).some(n => n.toLowerCase().includes(needle)) ||
      (t.lastMessage ?? '').toLowerCase().includes(needle),
    )
  }, [q, threads])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-6"
    >
      <header className="flex items-end justify-between gap-3 border-b border-border pb-5">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-text-base">Чат</h1>
          <p className="mt-1 text-sm text-text-muted">
            Общение с заказчиками и исполнителями. Сообщения сохраняются локально на этом устройстве.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по диалогам…"
              className="w-full rounded-md border border-border bg-bg-card pl-8 pr-3 py-2 text-sm text-text-base placeholder:text-text-faint focus:border-white/30 focus:outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-card/40 p-8 text-center">
              <MessageSquare className="mx-auto mb-2 h-6 w-6 text-text-faint" />
              <p className="text-sm font-medium text-text-base">Диалогов пока нет</p>
              <p className="mt-1 text-xs text-text-muted">
                Откройте профиль или заказ и нажмите «Написать», чтобы начать.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map(t => {
                const otherId = t.participants.find(p => p !== user?.profileId) ?? t.participants[0]
                const otherName = t.participantNames[otherId] ?? 'Собеседник'
                const lastRead = user?.profileId ? t.readAt?.[user.profileId] : null
                const isUnread = !!t.lastAt && (!lastRead || t.lastAt > lastRead)
                return (
                  <li key={t.id}>
                    <LocaleLink
                      href={`/dashboard/chat/${encodeURIComponent(t.id)}`}
                      className="flex items-start gap-3 rounded-xl border border-border bg-bg-card p-3 transition-colors hover:bg-bg-elevated"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-bg-elevated">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={DEFAULT_AVATAR_URL} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-text-base">{otherName}</p>
                          {t.lastAt && (
                            <span className="shrink-0 text-[10px] text-text-faint">
                              {new Date(t.lastAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-text-muted">
                          {t.lastMessage ?? 'Нет сообщений'}
                        </p>
                      </div>
                      {isUnread && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#7170ff]" />
                      )}
                    </LocaleLink>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section className="rounded-xl border border-dashed border-border bg-bg-card/40 p-12 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-text-faint" />
          <p className="text-base font-medium text-text-base">Выберите диалог</p>
          <p className="mt-1 text-sm text-text-muted">
            Или начните новый — нажмите «Написать» на странице профиля или заказа.
          </p>
        </section>
      </div>
    </motion.div>
  )
}
