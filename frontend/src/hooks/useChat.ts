'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { HubConnection } from '@microsoft/signalr'
import { createConnection } from '@/lib/signalr'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

export interface ChatMessage {
  id:              string
  contractId:      string
  senderProfileId: string
  body:            string
  createdAt:       string
}

/**
 * Подключается к ChatHub, загружает историю сообщений по контракту
 * и подписывается на событие "message" для realtime-добавления.
 */
export function useChat(contractId: string | null | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading,  setLoading]  = useState(false)
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const connRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    if (!contractId) return
    let cancelled = false

    setLoading(true); setError(null)

    fetch(`${BASE_URL}/api/contracts/${contractId}/messages`, { credentials: 'include' })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<ChatMessage[]>
      })
      .then(items => { if (!cancelled) setMessages(items) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    ;(async () => {
      try {
        const conn = await createConnection('/hubs/chat')
        if (cancelled) { await conn.stop(); return }
        connRef.current = conn

        conn.on('message', (m: ChatMessage) => {
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
        })

        await conn.invoke('JoinContract', contractId)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Connection failed')
      }
    })()

    return () => {
      cancelled = true
      const c = connRef.current
      if (c) {
        c.invoke('LeaveContract', contractId).catch(() => {})
        c.stop().catch(() => {})
        connRef.current = null
      }
    }
  }, [contractId])

  const sendMessage = useCallback(async (body: string) => {
    if (!contractId || !connRef.current || !body.trim()) return
    setSending(true)
    try {
      await connRef.current.invoke('SendMessage', contractId, body.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }, [contractId])

  return { messages, loading, sending, error, sendMessage }
}
