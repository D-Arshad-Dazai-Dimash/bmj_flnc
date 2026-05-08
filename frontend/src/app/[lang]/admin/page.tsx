'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, Users, ClipboardList, CreditCard, TrendingUp, ShieldCheck, Activity } from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalOrders: number
  activeOrders: number
  totalPayments: number
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
    fetch(`${API_URL}/api/stats`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setStats({
            totalUsers: data.users ?? 0,
            totalOrders: (data.activeOrders ?? 0) + (data.completedOrders ?? 0),
            activeOrders: data.activeOrders ?? 0,
            totalPayments: 0,
          })
        }
      })
      .catch(() => {})
  }, [])

  const widgets = stats ? [
    { icon: Users, label: 'Пользователи', value: stats.totalUsers, tone: 'text-[#bfd1ff] border-[rgba(99,138,212,0.26)] bg-[rgba(99,138,212,0.08)]' },
    { icon: ClipboardList, label: 'Всего заказов', value: stats.totalOrders, tone: 'text-[#d8caef] border-[rgba(122,88,172,0.26)] bg-[rgba(122,88,172,0.08)]' },
    { icon: TrendingUp, label: 'Активных заказов', value: stats.activeOrders, tone: 'text-[#a8e0ef] border-[rgba(72,152,188,0.24)] bg-[rgba(72,152,188,0.08)]' },
    { icon: CreditCard, label: 'Платежей', value: stats.totalPayments, tone: 'text-[#efc7d9] border-[rgba(201,143,177,0.24)] bg-[rgba(201,143,177,0.08)]' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(201,143,177,0.18)] bg-[linear-gradient(180deg,rgba(201,143,177,0.12),rgba(122,88,172,0.08))]">
            <LayoutDashboard className="w-5 h-5 text-[#efc7d9]" />
          </div>
          <div>
            <div className="chip mb-2 border-[rgba(201,143,177,0.22)] bg-[rgba(201,143,177,0.08)] text-[#efc7d9]">Operations Console</div>
            <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">Панель администратора</h1>
            <p className="text-[15px] text-text-secondary">Общая статистика платформы и ключевой контрольный слой</p>
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-bg-card px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-2 text-[11px] font-[510] tracking-[0.08em] uppercase text-text-faint">
            <Activity className="h-3.5 w-3.5 text-[#a8e0ef]" />
            Live snapshot
          </div>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Модерация, финансы и операционные метрики сведены в единый control plane.</p>
        </div>
      </div>

      {stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {widgets.map((w, i) => (
              <motion.div
                key={w.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-[14px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)]"
              >
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] border ${w.tone}`}>
                  <w.icon className="h-4.5 w-4.5" />
                </div>
                <span className="block text-[28px] font-semibold tracking-h2 text-text-base">{w.value}</span>
                <span className="mt-1 block text-[11px] font-[510] uppercase tracking-[0.08em] text-text-faint">{w.label}</span>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[16px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#bfd1ff]" />
                <h2 className="text-[13px] font-[510] tracking-caption text-text-base">Операционный обзор</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { title: 'Moderation', text: 'Контур управления пользователями, контентом и потоками доступа.' },
                  { title: 'Marketplace', text: 'Публичные заказы, активность платформы и динамика спроса.' },
                  { title: 'Finance', text: 'Платежный слой готов под дальнейшее подключение escrow-модуля.' },
                ].map(card => (
                  <div key={card.title} className="rounded-[12px] border border-border bg-bg-card p-4">
                    <p className="text-[13px] font-[510] tracking-caption text-text-base">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{card.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[16px] border border-border bg-bg-card p-6 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
              <p className="text-[13px] font-[510] tracking-caption text-text-base">Сводка текущего состояния</p>
              <div className="mt-4 space-y-3">
                {[
                  `Пользователи: ${stats.totalUsers}`,
                  `Открытые и завершённые заказы: ${stats.totalOrders}`,
                  `Активные заказы: ${stats.activeOrders}`,
                  'Платёжный модуль ещё не публикует реальные транзакции',
                ].map(item => (
                  <div key={item} className="rounded-[10px] border border-border bg-bg-panel px-3 py-2.5 text-sm text-text-secondary">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
