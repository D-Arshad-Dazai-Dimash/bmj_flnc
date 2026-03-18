'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Eye, ExternalLink, CheckCircle2, RotateCcw } from 'lucide-react'

interface SupervisedOrder {
  id: string
  title: string
  budget: number | null
  supervision_status: string
  supervision_report: string | null
  repository_url: string | null
  client: { full_name: string } | null
  executor: { full_name: string } | null
}

const CHECKLIST = [
  'ТЗ выполнено',
  'Код проверен',
  'Тесты пройдены',
  'Документация присутствует',
]

export default function SupervisionDashboardPage() {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<SupervisedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [checks, setChecks] = useState<Record<string, boolean[]>>({})
  const [reports, setReports] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('projects')
      .select('id, title, budget, supervision_status, supervision_report, repository_url, client:profiles!projects_client_id_fkey(full_name), executor:profiles!projects_executor_id_fkey(full_name)')
      .eq('tech_supervisor_id', user.id)
      .eq('package_tier', 3)
      .in('status', ['in_progress', 'completed'])
      .order('created_at', { ascending: false })
    setOrders((data as unknown as SupervisedOrder[]) ?? [])
    setLoading(false)
  }, [user?.id, supabase])

  useEffect(() => { load() }, [load])

  const toggleCheck = (orderId: string, idx: number) => {
    setChecks(prev => {
      const arr = [...(prev[orderId] || Array(CHECKLIST.length).fill(false))]
      arr[idx] = !arr[idx]
      return { ...prev, [orderId]: arr }
    })
  }

  const approve = async (orderId: string) => {
    const report = reports[orderId] || ''
    await supabase.from('projects').update({
      supervision_status: 'approved',
      supervision_report: report,
    }).eq('id', orderId)

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, supervision_status: 'approved', supervision_report: report } : o))
  }

  const requestRevision = async (orderId: string) => {
    const report = reports[orderId] || ''
    await supabase.from('projects').update({
      supervision_status: 'revision',
      supervision_report: report,
    }).eq('id', orderId)

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, supervision_status: 'revision', supervision_report: report } : o))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-orange-500/15">
          <Eye className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Технический надзор</h1>
          <p className="text-sm text-text-muted">Назначенные заказы пакета 3</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
          <Eye className="w-10 h-10 text-text-faint mx-auto mb-3" />
          <p className="text-sm text-text-muted">Назначенных заказов пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => {
            const orderChecks = checks[o.id] || Array(CHECKLIST.length).fill(false)
            const allChecked = orderChecks.every(Boolean)

            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-bg-card p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-text-base">{o.title}</h3>
                    <p className="text-xs text-text-muted mt-1">
                      Клиент: {o.client?.full_name ?? '—'} · Исполнитель: {o.executor?.full_name ?? '—'}
                      {o.budget && ` · ${o.budget.toLocaleString('ru-RU')} ₸`}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full border ${
                    o.supervision_status === 'approved' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' :
                    o.supervision_status === 'revision' ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' :
                    'border-border text-text-faint'
                  }`}>
                    {o.supervision_status}
                  </span>
                </div>

                {o.repository_url && (
                  <a
                    href={o.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-accent-light hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Репозиторий
                  </a>
                )}

                {/* Checklist */}
                <div className="space-y-2">
                  {CHECKLIST.map((item, idx) => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orderChecks[idx]}
                        onChange={() => toggleCheck(o.id, idx)}
                        className="w-4 h-4 rounded border-border accent-emerald-500"
                      />
                      <span className="text-sm text-text-muted">{item}</span>
                    </label>
                  ))}
                </div>

                {/* Report */}
                <textarea
                  value={reports[o.id] || o.supervision_report || ''}
                  onChange={e => setReports(prev => ({ ...prev, [o.id]: e.target.value }))}
                  placeholder="Отчёт о проверке..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-bg-base border border-border text-sm text-text-base resize-none focus:outline-none focus:border-accent transition-colors"
                />

                {/* Actions */}
                {o.supervision_status !== 'approved' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(o.id)}
                      disabled={!allChecked}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Подтвердить выполнение
                    </button>
                    <button
                      onClick={() => requestRevision(o.id)}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> На доработку
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
