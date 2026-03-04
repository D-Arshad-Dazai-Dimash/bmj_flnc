'use client'

import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import { countQazaqBusinessDays } from '@/lib/calendar'
import { motion } from 'framer-motion'
import { memo, useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard, TrendingUp, Clock,
  CheckCircle2, AlertCircle, CalendarClock,
} from 'lucide-react'

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
}

interface DashboardStats {
  active: number
  completed: number
  extra1: string
  extra2: string
}

interface TimelineProject {
  id: string
  title: string
  deadline: string
  daysLeft: number
  totalDays: number
  pct: number // % time remaining (0-100)
}

// ── React.memo: StatCard не перерисовывается, если пропсы не изменились ──
const StatCard = memo(function StatCard({ label, value, sub, color = 'accent' }: {
  label: string
  value: string
  sub?: string
  color?: 'accent' | 'cyan' | 'green' | 'yellow'
}) {
  const colors = {
    accent: 'text-accent-light bg-accent/10 border-accent/20',
    cyan:   'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    green:  'text-green-400 bg-green-400/10 border-green-400/20',
    yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  }
  return (
    <motion.div
      variants={item}
      className={`rounded-xl border p-5 flex flex-col gap-1 ${colors[color]}`}
    >
      <span className="text-xs font-medium opacity-70">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {sub && <span className="text-xs opacity-60">{sub}</span>}
    </motion.div>
  )
})

export default function DashboardPage() {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const isDev = user?.accountType === 'Developer'

  const [stats,    setStats]    = useState<DashboardStats | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [timeline, setTimeline] = useState<TimelineProject[]>([])

  useEffect(() => {
    if (!user) return
    const uid = user.id

    function buildTimeline(rows: { id: string; title: string; deadline: string | null; created_at: string }[]) {
      const now = new Date()
      const items: TimelineProject[] = rows
        .filter(p => !!p.deadline)
        .map(p => {
          const start    = new Date(p.created_at)
          const end      = new Date(p.deadline!)
          const totalDays = countQazaqBusinessDays(start, end)
          const daysLeft  = Math.max(0, countQazaqBusinessDays(now, end))
          const pct       = totalDays > 0 ? Math.min(100, Math.round((daysLeft / totalDays) * 100)) : 0
          return { id: p.id, title: p.title, deadline: p.deadline!, daysLeft, totalDays, pct }
        })
      setTimeline(items)
    }

    async function load() {
      try {
        if (isDev) {
          // Freelancer: parallel queries
          const [activeRes, doneRes] = await Promise.all([
            supabase
              .from('projects')
              .select('*', { count: 'exact', head: true })
              .eq('executor_id', uid)
              .eq('status', 'in_progress'),
            supabase
              .from('projects')
              .select('*', { count: 'exact', head: true })
              .eq('executor_id', uid)
              .eq('status', 'completed'),
          ])

          setStats({
            active:    activeRes.count ?? 0,
            completed: doneRes.count ?? 0,
            extra1:    '—',
            extra2:    '—',
          })

          // Timeline: active freelancer projects with deadlines
          const tlRes = await supabase
            .from('projects')
            .select('id, title, deadline, created_at')
            .eq('executor_id', uid)
            .eq('status', 'in_progress')
            .not('deadline', 'is', null)
            .limit(3)
          buildTimeline(tlRes.data ?? [])
        } else {
          // Client: parallel queries (3 at once instead of sequential)
          const [activeRes, doneRes, budgetRes] = await Promise.all([
            supabase
              .from('projects')
              .select('*', { count: 'exact', head: true })
              .eq('client_id', uid)
              .in('status', ['open', 'in_progress']),
            supabase
              .from('projects')
              .select('*', { count: 'exact', head: true })
              .eq('client_id', uid)
              .eq('status', 'completed'),
            supabase
              .from('projects')
              .select('budget')
              .eq('client_id', uid)
              .eq('status', 'completed'),
          ])

          const totalBudget = (budgetRes.data ?? []).reduce(
            (sum, p) => sum + (p.budget ?? 0), 0
          )

          setStats({
            active:    activeRes.count ?? 0,
            completed: doneRes.count ?? 0,
            extra1:    totalBudget > 0 ? `₸${totalBudget.toLocaleString('ru-RU')}` : '₸0',
            extra2:    '0',
          })

          // Timeline: active client projects with deadlines
          const tlRes = await supabase
            .from('projects')
            .select('id, title, deadline, created_at')
            .eq('client_id', uid)
            .eq('status', 'in_progress')
            .not('deadline', 'is', null)
            .limit(3)
          buildTimeline(tlRes.data ?? [])
        }
      } catch (err) {
        console.error('[Dashboard] stats load error:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, isDev, supabase])

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-accent/15">
          <LayoutDashboard className="w-5 h-5 text-accent-light" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">
            Добро пожаловать, {user?.profileName} 👋
          </h1>
          <p className="text-sm text-text-muted">
            {isDev ? 'Панель разработчика' : 'Панель заказчика'}
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item}>
        <h2 className="text-xs font-mono uppercase tracking-widest text-text-faint mb-3">Статистика</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {isDev ? (
              <>
                <StatCard label="В работе"            value={String(stats?.active ?? 0)}    sub="проектов"       color="accent" />
                <StatCard label="Завершено проектов"   value={String(stats?.completed ?? 0)} sub="за всё время"   color="green"  />
                <StatCard label="Рейтинг"             value={stats?.extra1 ?? '—'}          sub="ещё нет оценок" color="yellow" />
                <StatCard label="Клан"                value={stats?.extra2 ?? '—'}          sub="не состоите"    color="cyan"   />
              </>
            ) : (
              <>
                <StatCard label="Активных проектов"   value={String(stats?.active ?? 0)}    sub="в работе"       color="accent" />
                <StatCard label="Завершено"            value={String(stats?.completed ?? 0)} sub="всего"          color="green"  />
                <StatCard label="Бюджет потрачен"      value={stats?.extra1 ?? '₸0'}        sub="завершённых"    color="yellow" />
                <StatCard label="Команд нанято"        value={stats?.extra2 ?? '0'}         sub="всего"          color="cyan"   />
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* Project Timeline */}
      {timeline.length > 0 && (
        <motion.div variants={item}>
          <h2 className="text-xs font-mono uppercase tracking-widest text-text-faint mb-3">Таймлайн проектов</h2>
          <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-4 relative overflow-hidden">
            {/* Accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            <div className="flex items-center gap-2 text-sm font-medium text-text-base">
              <CalendarClock className="w-4 h-4 text-emerald-400" />
              Активные дедлайны
            </div>
            <div className="space-y-3">
              {timeline.map(proj => {
                const barColor =
                  proj.pct > 50 ? 'bg-emerald-500' :
                  proj.pct > 20 ? 'bg-amber-400'   : 'bg-red-500'
                const textColor =
                  proj.pct > 50 ? 'text-emerald-400' :
                  proj.pct > 20 ? 'text-amber-400'   : 'text-red-400'
                return (
                  <div key={proj.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-text-base truncate max-w-[70%]">{proj.title}</p>
                      <span className={`text-xs font-mono ${textColor}`}>
                        {proj.daysLeft > 0 ? `${proj.daysLeft} р.д.` : 'Просрочен'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-hover overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${proj.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-faint">
                      Дедлайн: {new Date(proj.deadline).toLocaleDateString('ru-RU')}
                      {' · '}{proj.totalDays} р.д. всего
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Activity placeholder */}
      <motion.div variants={item}>
        <h2 className="text-xs font-mono uppercase tracking-widest text-text-faint mb-3">Последняя активность</h2>
        <div className="rounded-xl border border-border bg-bg-card p-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="p-3 rounded-full bg-bg-hover">
            <Clock className="w-6 h-6 text-text-faint" />
          </div>
          <p className="text-sm text-text-muted">Активность пока отсутствует</p>
          <p className="text-xs text-text-faint max-w-xs">
            {isDev
              ? 'Откликнитесь на заказы из ленты, чтобы начать работу'
              : 'Создайте своё первое ТЗ, чтобы найти команду'}
          </p>
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={item}>
        <h2 className="text-xs font-mono uppercase tracking-widest text-text-faint mb-3">Быстрые действия</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {isDev ? (
            <>
              <QuickCard icon={<TrendingUp className="w-4 h-4" />}  title="Найти заказы"   desc="Просмотр ленты заказов"   href="/dashboard/orders" />
              <QuickCard icon={<CheckCircle2 className="w-4 h-4" />} title="Пройти тест"    desc="Подтвердите свои навыки"  href="/dashboard/tests"  />
            </>
          ) : (
            <>
              <QuickCard icon={<TrendingUp className="w-4 h-4" />}   title="Создать ТЗ"    desc="Опубликуйте новый проект"  href="/dashboard/create-project" />
              <QuickCard icon={<AlertCircle className="w-4 h-4" />}  title="Найти команду" desc="Поиск по кланам и навыкам" href="/dashboard/find-teams"     />
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── React.memo: QuickCard — статический контент, не нужно перерисовывать ──
const QuickCard = memo(function QuickCard({ icon, title, desc, href }: { icon: React.ReactNode; title: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-bg-card hover:border-accent/40 hover:bg-bg-hover transition-all duration-200 group"
    >
      <div className="p-2.5 rounded-lg bg-accent/10 text-accent-light group-hover:bg-accent/20 transition-colors">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-text-base">{title}</p>
        <p className="text-xs text-text-muted">{desc}</p>
      </div>
    </a>
  )
})
