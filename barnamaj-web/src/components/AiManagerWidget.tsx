'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquare, X, Send, Copy, Save, Sparkles, FileText } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'model'
  parts: string
  type?: 'text' | 'concept' | 'tz'
}

interface Props {
  userId: string
}

const POS_KEY = 'barnamaj_ai_widget_pos'
const HIST_KEY = 'barnamaj_ai_widget_history'

// ─── Helpers: parse special tags ──────────────────────────────────────────────

function parseConcepts(text: string): string[] {
  const re = /\[CONCEPT\]([\s\S]*?)\[\/CONCEPT\]/g
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push(m[1].trim())
  return out
}

function parseTZ(text: string): string | null {
  const m = text.match(/\[TZ_START\]([\s\S]*?)\[TZ_END\]/)
  return m ? m[1].trim() : null
}

function stripTags(text: string): string {
  return text
    .replace(/\[CONCEPT\][\s\S]*?\[\/CONCEPT\]/g, '')
    .replace(/\[TZ_START\][\s\S]*?\[TZ_END\]/g, '')
    .trim()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiManagerWidget({ userId }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Position state for draggable window
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load position & history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY)
      if (saved) setPos(JSON.parse(saved))
    } catch { /* ignore */ }
    try {
      const hist = localStorage.getItem(HIST_KEY)
      if (hist) setMessages(JSON.parse(hist))
    } catch { /* ignore */ }
  }, [])

  // Save position
  useEffect(() => {
    if (pos.x !== 0 || pos.y !== 0) {
      localStorage.setItem(POS_KEY, JSON.stringify(pos))
    }
  }, [pos])

  // Save history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(HIST_KEY, JSON.stringify(messages))
    }
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Drag handlers ──────────────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy })
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [pos])

  // ── Send message ───────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', parts: text, type: 'text' }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-manager/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: updated.map(m => ({ role: m.role, parts: m.parts })),
          userId,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Ошибка сервера' }))
        setMessages(prev => [...prev, { role: 'model', parts: err.error || 'Ошибка', type: 'text' }])
        return
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'model', parts: data.reply, type: data.type }])
    } catch {
      setMessages(prev => [...prev, { role: 'model', parts: 'Ошибка соединения', type: 'text' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, userId])

  // ── Copy TZ to clipboard ──────────────────────────────────
  const copyTZ = useCallback((tz: string) => {
    navigator.clipboard.writeText(tz)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  // ── Clear chat ─────────────────────────────────────────────
  const clearChat = useCallback(() => {
    setMessages([])
    localStorage.removeItem(HIST_KEY)
  }, [])

  // ── Render message content ─────────────────────────────────
  const renderMessage = (msg: ChatMessage, idx: number) => {
    const isUser = msg.role === 'user'

    if (isUser) {
      return (
        <div key={idx} className="flex justify-end">
          <div className="max-w-[80%] rounded-xl rounded-tr-sm px-3 py-2 text-sm bg-accent/20 text-text-base">
            {msg.parts}
          </div>
        </div>
      )
    }

    const concepts = parseConcepts(msg.parts)
    const tz = parseTZ(msg.parts)
    const plain = stripTags(msg.parts)

    return (
      <div key={idx} className="flex justify-start">
        <div className="max-w-[85%] space-y-2">
          {/* Plain text */}
          {plain && (
            <div className="rounded-xl rounded-tl-sm px-3 py-2 text-sm bg-bg-hover text-text-base whitespace-pre-wrap">
              {plain}
            </div>
          )}

          {/* Concepts */}
          {concepts.map((c, i) => (
            <div key={i} className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-sm">
              <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 mb-1">
                <Sparkles className="w-3 h-3" /> Концепт
              </div>
              <p className="text-text-base whitespace-pre-wrap">{c}</p>
            </div>
          ))}

          {/* TZ block */}
          {tz && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <FileText className="w-3 h-3" /> Техническое задание
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => copyTZ(tz)}
                    className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                    title="Скопировать"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([tz], { type: 'text/markdown' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'tz.md'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                    title="Сохранить как файл"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-text-base whitespace-pre-wrap text-xs leading-relaxed border-t border-emerald-500/20 pt-2">
                {tz}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-accent text-white shadow-lg shadow-accent/25 hover:bg-accent/90 transition-all hover:scale-105"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-medium">ИИ Менеджер</span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          ref={windowRef}
          className="fixed z-50 w-[380px] h-[520px] flex flex-col rounded-2xl border border-border bg-bg-card shadow-2xl shadow-black/30"
          style={{
            bottom: `${24 - pos.y}px`,
            right: `${24 - pos.x}px`,
          }}
        >
          {/* Header — drag handle */}
          <div
            onMouseDown={onDragStart}
            className="flex items-center justify-between px-4 py-3 border-b border-border cursor-move select-none shrink-0 rounded-t-2xl bg-bg-card"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-light" />
              <span className="text-sm font-semibold text-text-base">ИИ Менеджер ТЗ</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg hover:bg-bg-hover text-text-faint hover:text-text-muted transition-colors text-xs"
                  title="Очистить чат"
                >
                  Очистить
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-hover text-text-faint hover:text-text-base transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <div className="p-3 rounded-full bg-accent/10">
                  <Sparkles className="w-6 h-6 text-accent-light" />
                </div>
                <p className="text-sm text-text-muted">
                  Опишите ваш проект, и я помогу составить техническое задание
                </p>
                <p className="text-xs text-text-faint">
                  Я задам уточняющие вопросы и предложу технические решения
                </p>
              </div>
            )}

            {messages.map(renderMessage)}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl rounded-tl-sm px-3 py-2 bg-bg-hover">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-text-faint animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-text-faint animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-text-faint animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Copied toast */}
          {copied && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium shadow-lg">
              Скопировано!
            </div>
          )}

          {/* Input area */}
          <div className="shrink-0 px-3 py-3 border-t border-border">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Опишите задачу..."
                rows={2}
                className="flex-1 resize-none rounded-xl border border-border bg-bg-base px-3 py-2 text-sm text-text-base placeholder-text-faint focus:outline-none focus:border-accent/50 transition-colors"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="self-end p-2.5 rounded-xl bg-accent text-white disabled:opacity-40 hover:bg-accent/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
