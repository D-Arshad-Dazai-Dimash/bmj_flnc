'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { ProjectStatus } from '@/lib/database.types'
import { ClipboardList } from 'lucide-react'

interface OrderRow {
  id: string
  title: string
  status: string
  order_type: string
  budget: number | null
  package_tier: number | null
  created_at: string
  client: { full_name: string } | null
}

export default function AdminOrdersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      let q = supabase
        .from('projects')
        .select('id, title, status, order_type, budget, package_tier, created_at, client:profiles!projects_client_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') q = q.eq('status', statusFilter as ProjectStatus)
      const { data } = await q
      setOrders((data as unknown as OrderRow[]) ?? [])
      setLoading(false)
    }
    load()
  }, [supabase, statusFilter])

  const changeStatus = async (id: string, status: ProjectStatus) => {
    await supabase.from('projects').update({ status }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  const statusColors: Record<string, string> = {
    open: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    completed: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    cancelled: 'text-red-400 bg-red-500/10 border-red-500/30',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/15">
            <ClipboardList className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="text-xl font-bold text-text-base">Заказы</h1>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-bg-card border border-border text-sm text-text-base"
        >
          <option value="all">Все статусы</option>
          <option value="open">Открыт</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Завершён</option>
          <option value="cancelled">Отменён</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-card border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-faint">Название</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-faint">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-faint">Тип</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-faint">Бюджет</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-text-faint">Пакет</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-text-faint">Статус</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-bg-hover/50 transition-colors">
                  <td className="px-4 py-3 text-text-base truncate max-w-[200px]">{o.title}</td>
                  <td className="px-4 py-3 text-text-muted">{o.client?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted text-xs">{o.order_type}</td>
                  <td className="px-4 py-3 text-right text-text-muted">{o.budget ? `${o.budget.toLocaleString('ru-RU')} ₸` : '—'}</td>
                  <td className="px-4 py-3 text-center text-text-muted">{o.package_tier ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={o.status}
                      onChange={e => changeStatus(o.id, e.target.value as ProjectStatus)}
                      className={`text-xs px-2 py-1 rounded-lg border ${statusColors[o.status] ?? 'border-border text-text-muted'}`}
                    >
                      <option value="open">Открыт</option>
                      <option value="in_progress">В работе</option>
                      <option value="completed">Завершён</option>
                      <option value="cancelled">Отменён</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
