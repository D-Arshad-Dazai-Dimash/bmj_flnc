'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles, CheckCircle2, RefreshCw, Save } from 'lucide-react'
import type { OrderType } from '@/lib/database.types'
import { useTzDraft, type TzMessage } from '@/hooks/useTzDraft'

interface TzResult {
  ready: boolean
  title: string
  description: string
  budget: number
  order_type: OrderType
}

type Message = TzMessage

interface Props {
  onApply:          (result: TzResult) => void
  onClose:          () => void
  /** Опциональное восстановление конкретного черновика (id из panel). */
  initialDraftId?:  string | null
  initialMessages?: Message[]
  initialTitle?:    string
}

const STARTER = 'Привет! Я помогу вам составить техническое задание. Расскажите — что вы хотите создать? Опишите идею своими словами, без технических деталей.'

function extractJson(text: string): TzResult | null {
  const match = text.match(/```json\s*([\s\S]*?)```/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    if (parsed.ready && parsed.title && parsed.description) return parsed as TzResult
  } catch { /* */ }
  return null
}

export default function AiTzWizard({
  onApply,
  onClose,
  initialDraftId   = null,
  initialMessages,
  initialTitle     = '',
}: Props) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages && initialMessages.length > 0
      ? initialMessages
      : [{ role: 'assistant', content: STARTER }],
  )
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<TzResult | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [title, setTitle]       = useState(initialTitle)
  const [savedNotice, setSavedNotice] = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { saveDraft, clearDraft } = useTzDraft(initialDraftId, title, messages)

  // Заголовок берём из первой реплики юзера, если ещё не задан явно
  useEffect(() => {
    if (title) return
    const firstUser = messages.find(m => m.role === 'user')
    if (firstUser) setTitle(firstUser.content.slice(0, 60))
  }, [messages, title])

  function handleSave() {
    saveDraft()
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2000)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    // assistant placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ai/tz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Ошибка сервера')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: full }
          return copy
        })
      }

      const parsed = extractJson(full)
      if (parsed) setResult(parsed)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка соединения'
      setError(msg)
      setMessages(prev => prev.slice(0, -1)) // remove empty assistant
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function reset() {
    setMessages([{ role: 'assistant', content: STARTER }])
    setInput('')
    setTitle('')
    setResult(null)
    setError(null)
    clearDraft()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-xl h-[600px] rounded-2xl border border-border bg-bg-card flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <div className="p-1.5 rounded-lg bg-accent/15">
            <Sparkles className="w-4 h-4 text-accent-light" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-base">ИИ-помощник создания ТЗ</p>
            <p className="text-xs text-text-faint">Опишите идею — ИИ составит техзадание</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              title={savedNotice ? 'Сохранено!' : 'Сохранить черновик'}
              className={`p-1.5 rounded-lg transition-colors ${savedNotice ? 'text-emerald-400' : 'text-text-faint hover:text-text-muted hover:bg-bg-hover'}`}
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={reset}
              title="Начать заново"
              className="p-1.5 rounded-lg text-text-faint hover:text-text-muted hover:bg-bg-hover transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-faint hover:text-text-muted hover:bg-bg-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-accent text-white rounded-br-sm'
                      : 'bg-bg-surface border border-border text-text-base rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' && msg.content === '' && loading ? (
                    <span className="flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-faint animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-text-faint animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-text-faint animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : (
                    // Hide raw JSON block from display
                    msg.content.replace(/```json[\s\S]*?```/g, '').trim()
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Result banner */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-3"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-300">ТЗ готово!</p>
                <p className="text-xs text-text-faint truncate">{result.title}</p>
              </div>
              <button
                onClick={() => { onApply(result); clearDraft() }}
                className="flex-shrink-0 px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-400 transition-colors"
              >
                Применить →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="border-t border-border px-4 py-3 flex gap-2 items-end flex-shrink-0">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Напишите сообщение... (Enter — отправить)"
            rows={1}
            disabled={loading || !!result}
            className="flex-1 resize-none rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 disabled:opacity-40 max-h-32"
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = t.scrollHeight + 'px'
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading || !!result}
            className="p-2.5 rounded-xl bg-accent text-white hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
