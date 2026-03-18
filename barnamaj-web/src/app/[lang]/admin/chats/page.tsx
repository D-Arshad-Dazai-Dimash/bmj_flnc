'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { MessageSquare, Ban, AlertTriangle } from 'lucide-react'

// Patterns for detecting system bypass attempts
const BYPASS_PATTERNS = [
  /[\w.+-]+@[\w-]+\.[\w.]+/g,           // email
  /\+?\d[\d\s\-()]{8,}/g,               // phone
  /@\w{2,}/g,                            // @username
  /t\.me\/\w+/gi,                        // telegram
  /wa\.me\/\d+/gi,                       // whatsapp
]

function highlightBypass(text: string): { html: string; hasAlert: boolean } {
  let hasAlert = false
  let result = text
  for (const pat of BYPASS_PATTERNS) {
    result = result.replace(pat, match => {
      hasAlert = true
      return `<mark class="bg-red-500/20 text-red-300 px-0.5 rounded">${match}</mark>`
    })
  }
  return { html: result, hasAlert }
}

interface ChatRow {
  id: string
  project: { title: string } | null
  client_profile: { full_name: string } | null
  freelancer_profile: { full_name: string } | null
  status: string
}

interface Msg {
  id: string
  text: string
  sender: { full_name: string } | null
  created_at: string
}

export default function AdminChatsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [chats, setChats] = useState<ChatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('contracts')
        .select('id, status, project:projects(title), client_profile:profiles!contracts_client_id_fkey(full_name), freelancer_profile:profiles!contracts_freelancer_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      setChats((data as unknown as ChatRow[]) ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  const loadMessages = async (contractId: string) => {
    setSelectedChat(contractId)
    const { data } = await supabase
      .from('messages')
      .select('id, text, created_at, sender:profiles!messages_sender_id_fkey(full_name)')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages((data as unknown as Msg[]) ?? [])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-cyan-500/15">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
        </div>
        <h1 className="text-xl font-bold text-text-base">Чаты</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Chat list */}
        <div className="md:col-span-1 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : chats.map(c => (
            <button
              key={c.id}
              onClick={() => loadMessages(c.id)}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${
                selectedChat === c.id ? 'border-accent/40 bg-accent/5' : 'border-border bg-bg-card hover:bg-bg-hover'
              }`}
            >
              <p className="text-sm font-medium text-text-base truncate">{c.project?.title ?? 'Без проекта'}</p>
              <p className="text-xs text-text-muted mt-1">
                {c.client_profile?.full_name} ↔ {c.freelancer_profile?.full_name}
              </p>
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="md:col-span-2 rounded-xl border border-border bg-bg-card p-4">
          {!selectedChat ? (
            <p className="text-sm text-text-faint text-center py-12">Выберите чат для просмотра</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-text-faint text-center py-12">Нет сообщений</p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {messages.map(msg => {
                const { html, hasAlert } = highlightBypass(msg.text)
                return (
                  <div key={msg.id} className={`rounded-lg p-3 ${hasAlert ? 'border border-red-500/30 bg-red-500/5' : 'bg-bg-hover/50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-text-muted">{msg.sender?.full_name ?? '?'}</span>
                      <span className="text-xs text-text-faint">{new Date(msg.created_at).toLocaleString('ru-RU')}</span>
                      {hasAlert && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    </div>
                    <p className="text-sm text-text-base" dangerouslySetInnerHTML={{ __html: html }} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
