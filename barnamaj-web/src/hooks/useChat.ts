'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { MessageWithSender } from '@/lib/database.types'

export function useChat(contractId: string) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const [replyTo, setReplyTo]   = useState<MessageWithSender | null>(null)
  const sbRef = useRef(createClient())

  // ── Initial load ───────────────────────────────────────────
  useEffect(() => {
    if (!contractId) return
    const sb = sbRef.current
    let cancelled = false

    async function load() {
      const { data } = await sb
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
          reply_to:messages!messages_reply_to_id_fkey(
            id, text, sender_id,
            sender:profiles!messages_sender_id_fkey(id, full_name)
          )
        `)
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (!cancelled && data) {
        setMessages(data as unknown as MessageWithSender[])
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [contractId])

  // ── Realtime subscription ──────────────────────────────────
  useEffect(() => {
    if (!contractId || !user?.id) return
    const sb = sbRef.current

    const channel = sb
      .channel(`chat-${contractId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `contract_id=eq.${contractId}`,
        },
        async (payload) => {
          // Fetch full message with sender profile
          const { data } = await sb
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
              reply_to:messages!messages_reply_to_id_fkey(
                id, text, sender_id,
                sender:profiles!messages_sender_id_fkey(id, full_name)
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages(prev => [...prev, data as unknown as MessageWithSender])
          }
        }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [contractId, user?.id])

  // ── Send message ───────────────────────────────────────────
  const sendMessage = useCallback(async (text: string, replyToId?: string) => {
    if (!user?.id || !text.trim()) return
    setSending(true)
    try {
      await sbRef.current
        .from('messages')
        .insert({
          contract_id: contractId,
          sender_id:   user.id,
          text:        text.trim(),
          reply_to_id: replyToId ?? null,
        })
      setReplyTo(null)
    } finally {
      setSending(false)
    }
  }, [contractId, user?.id])

  return { messages, loading, sending, sendMessage, replyTo, setReplyTo }
}
