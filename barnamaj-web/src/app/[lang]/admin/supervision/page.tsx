'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Eye } from 'lucide-react'

interface Tier3Order {
  id: string
  title: string
  budget: number | null
  status: string
  executor_id: string | null
  client: { full_name: string } | null
}

export default function AdminSupervisionPage() {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<Tier3Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('projects')
        .select('id, title, budget, status, executor_id, client:profiles!projects_client_id_fkey(full_name)')
        .eq('package_tier', 3)
        .order('created_at', { ascending: false })
        .limit(50)
      setOrders((data as unknown as Tier3Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-orange-500/15">
          <Eye className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Технадзор</h1>
          <p className="text-sm text-text-muted">Заказы пакета 3 с технадзором</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center text-sm text-text-muted">
          Заказов пакета 3 пока нет
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="rounded-xl border border-border bg-bg-card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-text-base text-sm truncate">{o.title}</p>
                <p className="text-xs text-text-muted mt-1">
                  Клиент: {o.client?.full_name ?? '—'} · Бюджет: {o.budget ? `${o.budget.toLocaleString('ru-RU')} ₸` : '—'}
                </p>
              </div>
              <span className={`shrink-0 text-xs px-2 py-1 rounded-full border ${
                o.status === 'in_progress' ? 'border-blue-500/40 text-blue-400 bg-blue-500/10' :
                o.status === 'completed' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' :
                'border-border text-text-faint'
              }`}>
                {o.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
