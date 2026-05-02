'use client'

import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Award, Mic, MicOff, Send, X, Clock,
  ChevronRight, Volume2, VolumeX, Loader2,
} from 'lucide-react'

type Specialization = 'frontend' | 'backend' | 'fullstack' | 'mobile'
type Level = 'junior' | 'middle' | 'senior'

interface AttestationStatus {
  level: Level | null
  specialization: Specialization | null
  score: number | null
  canRetake: boolean
  nextRetakeAt: string | null
  completedAt: string | null
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AttestationResult {
  level: Level
  score: number
  feedback: string
}

const SPEC_LABELS: Record<Specialization, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Fullstack',
  mobile: 'Mobile',
}

const LEVEL_COLORS: Record<Level, string> = {
  junior: 'text-green-400 bg-green-400/10 border-green-400/30',
  middle: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  senior: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
}

function parseResult(text: string): AttestationResult | null {
  const match = text.match(/\[RESULT\]([\s\S]*?)\[\/RESULT\]/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    if (parsed.level && typeof parsed.score === 'number' && parsed.feedback) {
      return parsed as AttestationResult
    }
  } catch { /* ignore */ }
  return null
}

export default function AttestationBlock() {
  const { user } = useAuth()

  const [status, setStatus] = useState<AttestationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedSpec, setSelectedSpec] = useState<Specialization | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<AttestationResult | null>(null)
  const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 min
  const [voiceOn, setVoiceOn] = useState(false)
  const [listening, setListening] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load attestation status — badges from assessment API
  useEffect(() => {
    if (!user) return
    async function loadStatus() {
      try {
        // profileId needed; use user.id as proxy if profileId not available
        const badges = await api.assessment.badges(user!.id)
        if (badges.length > 0) {
          const best = badges[0]
          setStatus({
            level: 'middle' as Level,  // level from badge category
            specialization: (best.category?.toLowerCase() as Specialization) ?? null,
            score: best.bestScore,
            canRetake: true,
            nextRetakeAt: null,
            completedAt: null,
          })
        } else {
          setStatus({
            level: null, specialization: null, score: null,
            canRetake: true, nextRetakeAt: null, completedAt: null,
          })
        }
      } catch {
        setStatus({
          level: null, specialization: null, score: null,
          canRetake: true, nextRetakeAt: null, completedAt: null,
        })
      } finally {
        setLoading(false)
      }
    }
    loadStatus()
  }, [user?.id])

  // Timer
  useEffect(() => {
    if (!chatOpen) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [chatOpen])

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startAttestation = useCallback(async (spec: Specialization) => {
    setSelectedSpec(spec)
    setChatOpen(true)
    setMessages([])
    setResult(null)
    setTimeLeft(30 * 60)
    setSending(true)

    try {
      const initMessages = [{ role: 'user' as const, content: `Начни аттестацию по ${SPEC_LABELS[spec]}. Задай первый вопрос.` }]
      const res = await fetch('/api/attestation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialization: spec, messages: initMessages }),
      })

      const text = await res.text()
      setMessages([
        { role: 'user', content: initMessages[0].content },
        { role: 'assistant', content: text },
      ])

      if (voiceOn && typeof window !== 'undefined' && window.speechSynthesis) {
        const utter = new SpeechSynthesisUtterance(text.replace(/\[RESULT\][\s\S]*\[\/RESULT\]/, ''))
        utter.lang = 'ru-RU'
        window.speechSynthesis.speak(utter)
      }
    } catch {
      setMessages([{ role: 'assistant', content: 'Ошибка подключения к ИИ. Попробуйте позже.' }])
    }
    setSending(false)
  }, [voiceOn])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending || !selectedSpec) return

    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setSending(true)

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/attestation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialization: selectedSpec, messages: apiMessages }),
      })

      const text = await res.text()
      const assistantMsg: ChatMessage = { role: 'assistant', content: text }
      setMessages(prev => [...prev, assistantMsg])

      // Check for result
      const parsed = parseResult(text)
      if (parsed) {
        setResult(parsed)
        // Note: attestation save to DB will be implemented via backend API later
      }

      if (voiceOn && typeof window !== 'undefined' && window.speechSynthesis) {
        const cleanText = text.replace(/\[RESULT\][\s\S]*\[\/RESULT\]/, '')
        if (cleanText.trim()) {
          const utter = new SpeechSynthesisUtterance(cleanText)
          utter.lang = 'ru-RU'
          window.speechSynthesis.speak(utter)
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка. Попробуйте ещё раз.' }])
    }
    setSending(false)
  }, [input, sending, selectedSpec, messages, user, voiceOn])

  // Voice input
  const toggleVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return

    if (listening) {
      setListening(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const SpeechRecognition = SpeechRecognitionCtor as (new () => any) | undefined
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'ru-RU'
    recognition.continuous = false
    recognition.interimResults = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev + transcript)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognition.start()
    setListening(true)
  }, [listening])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  if (loading) return null

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-accent-light" />
        <h3 className="text-sm font-semibold">ИИ-Аттестация</h3>
      </div>

      {/* Current level */}
      {status?.level && (
        <div className="mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${LEVEL_COLORS[status.level]}`}>
            <Award className="w-4 h-4" />
            {status.level.toUpperCase()} — {status.specialization && SPEC_LABELS[status.specialization]}
          </div>
          {status.score !== null && (
            <p className="text-xs text-text-muted mt-1">Балл: {status.score}/100</p>
          )}
          {status.completedAt && (
            <p className="text-xs text-text-faint mt-0.5">
              Последняя: {new Date(status.completedAt).toLocaleDateString('ru-RU')}
            </p>
          )}
        </div>
      )}

      {/* Start button or retake info */}
      {status?.canRetake ? (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">Выберите специализацию:</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(SPEC_LABELS) as [Specialization, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => startAttestation(key)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg-surface hover:border-accent/40 hover:bg-accent/5 transition-all text-sm"
              >
                {label} <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          Повторная аттестация доступна{' '}
          {status?.nextRetakeAt && new Date(status.nextRetakeAt).toLocaleDateString('ru-RU')}
        </p>
      )}

      {/* Chat modal */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl h-[80vh] flex flex-col rounded-2xl border border-border bg-bg-card shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
                <Award className="w-5 h-5 text-accent-light" />
                <h3 className="text-sm font-semibold flex-1">
                  Аттестация: {selectedSpec && SPEC_LABELS[selectedSpec]}
                </h3>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  <span className={`font-mono ${timeLeft < 300 ? 'text-red-400' : ''}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <button
                  onClick={() => setVoiceOn(!voiceOn)}
                  className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
                  title={voiceOn ? 'Выключить озвучку' : 'Включить озвучку'}
                >
                  {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-50" />}
                </button>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-accent/20 text-text-base border border-accent/20'
                          : 'bg-bg-surface text-text-base border border-border'
                      }`}
                    >
                      {msg.content.replace(/\[RESULT\][\s\S]*\[\/RESULT\]/, '')}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-surface border border-border text-sm text-text-muted">
                      <Loader2 className="w-4 h-4 animate-spin" /> Думаю...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Result card */}
              {result && (
                <div className="mx-4 mb-3 p-4 rounded-xl border border-accent/30 bg-accent/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-accent-light" />
                    <span className="font-semibold text-sm">Результат аттестации</span>
                  </div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-bold mb-2 ${LEVEL_COLORS[result.level]}`}>
                    {result.level.toUpperCase()} — {result.score}/100
                  </div>
                  <p className="text-sm text-text-muted">{result.feedback}</p>
                  <button
                    onClick={() => { setChatOpen(false); window.location.reload() }}
                    className="mt-3 px-4 py-2 rounded-lg bg-accent/20 text-accent-light text-sm hover:bg-accent/30 transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              )}

              {/* Input */}
              {!result && (
                <div className="p-4 border-t border-border shrink-0">
                  <div className="flex gap-2">
                    <button
                      onClick={toggleVoiceInput}
                      className={`shrink-0 p-2.5 rounded-lg border transition-colors ${
                        listening
                          ? 'border-red-400/40 bg-red-400/10 text-red-400'
                          : 'border-border hover:border-accent/30'
                      }`}
                      title="Голосовой ввод"
                    >
                      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Ваш ответ..."
                      disabled={sending || timeLeft === 0}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-bg-surface text-sm focus:outline-none focus:border-accent/40"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !input.trim() || timeLeft === 0}
                      className="shrink-0 p-2.5 rounded-lg bg-accent/20 text-accent-light hover:bg-accent/30 disabled:opacity-40 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
