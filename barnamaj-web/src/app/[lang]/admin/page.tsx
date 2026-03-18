'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { LayoutDashboard, Users, ClipboardList, CreditCard, TrendingUp } from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalOrders: number
  activeOrders: number
  totalPayments: number
}

export default function AdminOverviewPage() {
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    async function load() {
      const [usersRes, ordersRes, activeRes, paymentsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase.from('payments').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        totalUsers: usersRes.count ?? 0,
        totalOrders: ordersRes.count ?? 0,
        activeOrders: activeRes.count ?? 0,
        totalPayments: paymentsRes.count ?? 0,
      })
    }
    load()
  }, [supabase])

  const widgets = stats ? [
    { icon: Users, label: 'Пользователи', value: stats.totalUsers, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { icon: ClipboardList, label: 'Всего заказов', value: stats.totalOrders, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    { icon: TrendingUp, label: 'Активных заказов', value: stats.activeOrders, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { icon: CreditCard, label: 'Платежей', value: stats.totalPayments, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-red-500/15">
          <LayoutDashboard className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Панель администратора</h1>
          <p className="text-sm text-text-muted">Общая статистика платформы</p>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {widgets.map((w, i) => (
            <motion.div
              key={w.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border p-5 flex flex-col gap-1 ${w.color}`}
            >
              <w.icon className="w-5 h-5 mb-1" />
              <span className="text-2xl font-bold">{w.value}</span>
              <span className="text-xs opacity-70">{w.label}</span>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
