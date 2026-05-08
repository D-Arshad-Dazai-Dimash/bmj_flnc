'use client'

import { useEffect, useState } from 'react'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { useAuth } from '@/context/AuthContext'
import { isAtLeast } from '@/context/AuthContext'
import Link from '@/components/ui/LocaleLink'
import { Loader2, Shield, LayoutDashboard, Megaphone, Users, ClipboardList, MessageSquare, ToggleRight, Eye, Wallet, FileText } from 'lucide-react'

const NAV = [
  { href: '/admin',               icon: LayoutDashboard, label: 'Обзор',          minRole: null },
  { href: '/admin/announcements', icon: Megaphone,       label: 'Объявления',     minRole: null },
  { href: '/admin/users',         icon: Users,           label: 'Пользователи',   minRole: null },
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
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth?mode=login')
      return
    }
    if (user) {
      // Доступ к admin-панели: Moderator, SeniorAdmin, HeadAdmin
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

  const visibleNav = NAV.filter(item =>
    item.minRole === null || isAtLeast(user!.role, item.minRole as 'Moderator' | 'SeniorAdmin' | 'HeadAdmin')
  )

  return (
    <div className="min-h-screen bg-bg-base flex">
      {/* Admin sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-bg-card flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b border-border">
          <Shield className="w-5 h-5 text-red-400" />
          <span className="font-bold text-text-base text-sm">Admin Panel</span>
          {user && (
            <span className="ml-auto text-[10px] text-text-faint bg-bg-hover px-1.5 py-0.5 rounded">
              {user.role}
            </span>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {visibleNav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text-base hover:bg-bg-hover transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Link href="/dashboard" className="text-xs text-text-faint hover:text-text-muted transition-colors">
            ← Назад в дашборд
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
