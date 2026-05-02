'use client'

import Link from '@/components/ui/LocaleLink'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { motion } from 'framer-motion'
import {
  User, Settings, LogOut,
  FileText, Users, ClipboardList,
  PlusSquare, FolderKanban, Search,
  LayoutDashboard, Shield,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import NotificationBell from './NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageSwitcher from '@/components/LanguageSwitcher'

// ─── Nav item types ────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

// Shared for all roles
const commonItems: NavItem[] = [
  { href: '/dashboard',          label: 'Обзор',     icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/dashboard/profile',  label: 'Профиль',   icon: <User className="w-4 h-4" /> },
  { href: '/dashboard/settings', label: 'Настройки', icon: <Settings className="w-4 h-4" /> },
]

const developerItems: NavItem[] = [
  { href: '/dashboard/orders',    label: 'Лента заказов', icon: <ClipboardList className="w-4 h-4" /> },
  { href: '/dashboard/contracts', label: 'Контракты',     icon: <Shield className="w-4 h-4" /> },
  { href: '/dashboard/clans',     label: 'Мои Кланы',     icon: <Users className="w-4 h-4" /> },
  { href: '/dashboard/tests',     label: 'Тесты',         icon: <FileText className="w-4 h-4" /> },
]

const clientItems: NavItem[] = [
  { href: '/dashboard/create-project', label: 'Разместить заказ', icon: <PlusSquare className="w-4 h-4" /> },
  { href: '/dashboard/projects',       label: 'Мои проекты',     icon: <FolderKanban className="w-4 h-4" /> },
  { href: '/dashboard/contracts',      label: 'Контракты',       icon: <Shield className="w-4 h-4" /> },
  { href: '/dashboard/clans',          label: 'Кланы',           icon: <Users className="w-4 h-4" /> },
  { href: '/dashboard/find-teams',     label: 'Поиск команд',    icon: <Search className="w-4 h-4" /> },
]

// ─── Nav item component ────────────────────────────────────────────────────────

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  // pathname includes locale prefix (e.g. /ru/dashboard), item.href doesn't
  // Strip /{lang}/ prefix for comparison
  const stripped = pathname.replace(/^\/(ru|en|kz)/, '') || '/'
  const isActive = stripped === item.href || (item.href !== '/dashboard' && stripped.startsWith(item.href))

  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group',
        isActive
          ? 'text-text-base bg-accent/15 font-medium'
          : 'text-text-muted hover:text-text-base hover:bg-bg-hover'
      )}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4/5 bg-accent rounded-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          layout="position"
        />
      )}
      <span className={cn(isActive ? 'text-accent-light' : 'text-text-faint group-hover:text-text-muted transition-colors')}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { user, logout } = useAuth()
  const router = useLocaleRouter()

  const roleItems = user?.accountType === 'Developer' ? developerItems : clientItems
  const roleLabel = user?.accountType === 'Developer' ? '👨‍💻 Разработчик' : '💼 Заказчик'

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <aside className="w-60 shrink-0 min-h-screen bg-bg-surface border-r border-border flex flex-col">

      {/* ── Logo ── */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-7 h-7">
            <Image src="/logo.png" alt="Barnamaj" fill className="object-contain" />
          </div>
          <span className="text-sm font-semibold text-text-base group-hover:text-accent-light transition-colors">
            Barnamaj
          </span>
        </Link>
        <NotificationBell />
      </div>

      {/* ── User card ── */}
      <div className="px-3 py-4 border-b border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center text-sm font-bold text-accent-light shrink-0 select-none">
            {user?.profileName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-base truncate">{user?.profileName}</p>
            <p className="text-xs text-text-muted truncate">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {/* Common */}
        {commonItems.map(item => <NavLink key={item.href} item={item} />)}

        {/* Role section divider */}
        <div className="my-3 flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-faint">
            {user?.accountType === 'Developer' ? 'Разработчик' : 'Заказчик'}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Role-specific */}
        {roleItems.map(item => <NavLink key={item.href} item={item} />)}
      </nav>

      {/* ── Footer: theme, lang, logout ── */}
      <div className="px-3 py-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between px-3">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>
    </aside>
  )
}
