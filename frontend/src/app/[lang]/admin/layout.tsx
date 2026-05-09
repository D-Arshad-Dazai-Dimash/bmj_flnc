'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { useAuth } from '@/context/AuthContext'
import { isAtLeast } from '@/context/AuthContext'
import Link from '@/components/ui/LocaleLink'
import { cn } from '@/lib/utils'
import { Loader2, Shield, LayoutDashboard, Megaphone, Users, ClipboardList, MessageSquare, ToggleRight, Eye, Wallet, FileText, ChevronLeft, Sparkles, ShieldCheck } from 'lucide-react'

const NAV = [
  { href: '/admin',               icon: LayoutDashboard, label: 'Обзор',          minRole: null },
  { href: '/admin/announcements', icon: Megaphone,       label: 'Объявления',     minRole: null },
  { href: '/admin/users',         icon: Users,           label: 'Пользователи',   minRole: null },
  { href: '/admin/kyc',           icon: ShieldCheck,     label: 'KYC',            minRole: null },
  { href: '/admin/orders',        icon: ClipboardList,   label: 'Заказы',         minRole: null },
  { href: '/admin/chats',         icon: MessageSquare,   label: 'Чаты',           minRole: null },
  { href: '/admin/features',      icon: ToggleRight,     label: 'Фичи',           minRole: 'SeniorAdmin' },
  { href: '/admin/supervision',   icon: Eye,             label: 'Технадзор',      minRole: null },
  { href: '/admin/finance',       icon: Wallet,          label: 'Финансы',        minRole: null },
  { href: '/admin/audit',         icon: FileText,        label: 'Аудит',          minRole: 'HeadAdmin' },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useLocaleRouter()
  const pathname = usePathname()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin-auth')
      return
    }
    if (user) {
      const allowed = isAtLeast(user.role, 'Moderator')
      setHasAccess(allowed)
      if (!allowed) router.replace('/dashboard')
    }
  }, [user, isLoading, isAuthenticated, router])

  if (isLoading || hasAccess === null) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  if (!hasAccess) return null

  const normalizedPath = pathname.replace(/^\/(ru|en|kz)/, '') || '/'
  const visibleNav = NAV.filter(item =>
    item.minRole === null || isAtLeast(user!.role, item.minRole as 'Moderator' | 'SeniorAdmin' | 'HeadAdmin')
  )

  return (
    <div className="min-h-screen bg-bg-base flex">
      <aside className="w-64 shrink-0 border-r border-border bg-bg-panel flex flex-col">
        <div className="border-b border-border px-4 py-4">
          <div className="rounded-[14px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[rgba(201,143,177,0.20)] bg-[linear-gradient(180deg,rgba(201,143,177,0.12),rgba(122,88,172,0.08))]">
                <Shield className="h-5 w-5 text-[#efc7d9]" />
              </div>
              <div>
                <div className="chip mb-1 border-[rgba(201,143,177,0.22)] bg-[rgba(201,143,177,0.08)] text-[#efc7d9]">Control Plane</div>
                <p className="text-sm font-semibold tracking-h3 text-text-base">Admin Panel</p>
              </div>
            </div>
            {user && (
              <div className="mt-4 flex items-center justify-between rounded-[10px] border border-border bg-bg-card px-3 py-2">
                <span className="text-[11px] font-[510] tracking-caption text-text-secondary">Уровень доступа</span>
                <span className="rounded-full border border-border bg-bg-panel px-2 py-0.5 text-[10px] font-[510] uppercase tracking-[0.08em] text-[#d8caef]">
                  {user.role}
                </span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map(item => {
            const isActive = normalizedPath === item.href || (item.href !== '/admin' && normalizedPath.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-[13px] tracking-caption transition-all duration-200',
                  isActive
                    ? 'border-border bg-bg-active text-text-base shadow-[0_1px_0_rgba(255,255,255,0.04)]'
                    : 'border-transparent text-text-secondary hover:border-border hover:bg-bg-hover hover:text-text-base'
                )}
              >
                <item.icon className={cn('h-4 w-4', isActive ? 'text-[#efc7d9]' : 'text-text-faint')} />
                <span className={cn(isActive ? 'font-[510]' : 'font-[400]')}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-4 space-y-3">
          <div className="rounded-[12px] border border-border bg-bg-card p-3 text-xs leading-5 text-text-secondary">
            <div className="mb-1 flex items-center gap-2 text-[#bfd1ff]">
              <Sparkles className="h-3.5 w-3.5" />
              Operational oversight
            </div>
            Метрики, модерация и контроль критических потоков платформы.
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-text-faint transition-colors hover:text-text-secondary">
            <ChevronLeft className="h-3.5 w-3.5" />
            Назад в дашборд
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
