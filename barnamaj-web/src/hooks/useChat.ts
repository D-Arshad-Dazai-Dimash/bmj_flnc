'use client'

// TODO (Неделя 1): Реализовать чат через SignalR (ChatHub)
// Временная заглушка — не ломает сборку

import { useCallback, useState } from 'react'

export interface MessageWithSender {
  id: string
  contract_id: string
  sender_id: string
  text: string
  created_at: string
  reply_to_id: string | null
  sender: { id: string; full_name: string; avatar_url?: string | null } | null
  reply_to: { id: string; text: string; sender_id: string; sender: { id: string; full_name: string } | null } | null
}

export function useChat(_contractId: string) {
  const [messages] = useState<MessageWithSender[]>([])
  const [replyTo, setReplyTo] = useState<MessageWithSender | null>(null)

  const sendMessage = useCallback(async (_text: string, _replyToId?: string) => {
    // TODO: SignalR send
  }, [])

  return {
    messages,
    loading:     false,
    sending:     false,
    replyTo,
    setReplyTo,
    sendMessage,
  }
}
