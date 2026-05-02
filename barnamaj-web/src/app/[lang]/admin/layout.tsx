'use client'

import { useEffect, useState } from 'react'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { useAuth } from '@/context/AuthContext'
import Link from '@/components/ui/LocaleLink'
import { Loader2, Shield, LayoutDashboard, Megaphone, Users, ClipboardList, MessageSquare, ToggleRight, Eye } from 'lucide-react'

const NAV = [
  { href: '/admin',               icon: LayoutDashboard, label: 'Обзор' },
  { href: '/admin/announcements',  icon: Megaphone,      label: 'Объявления' },
  { href: '/admin/users',          icon: Users,          label: 'Пользователи' },
  { href: '/admin/orders',         icon: ClipboardList,  label: 'Заказы' },
  { href: '/admin/chats',          icon: MessageSquare,  label: 'Чаты' },
  { href: '/admin/features',       icon: ToggleRight,    label: 'Фичи' },
  { href: '/admin/supervision',    icon: Eye,            label: 'Технадзор' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useLocaleRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth?mode=login')
      return
    }
    if (user) {
      // Admin check: role === 'Admin' в JWT-клейме от .NET API
      const isAdminUser = user.role === 'Admin'
      setIsAdmin(isAdminUser)
      if (!isAdminUser) router.replace('/dashboard')
    }
  }, [user, isLoading, isAuthenticated, router])

  if (isLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-bg-base flex">
      {/* Admin sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-bg-card flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b border-border">
          <Shield className="w-5 h-5 text-red-400" />
          <span className="font-bold text-text-base text-sm">Admin Panel</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(item => (
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
