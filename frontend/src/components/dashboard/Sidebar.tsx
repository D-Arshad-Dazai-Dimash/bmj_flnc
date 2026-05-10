'use client'

import { useEffect, useState } from 'react'
import Link from '@/components/ui/LocaleLink'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { motion } from 'framer-motion'
import {
  User, Settings, LogOut,
  FileText, Users, ClipboardList,
  PlusSquare, FolderKanban, Search,
  LayoutDashboard, Shield, MessageSquare,
  Bell, ShieldCheck, Trash2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import NotificationBell from './NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { unreadCountFor } from '@/lib/chatStore'

const LOGO_SRC = '/logo.png'

// ─── Nav item types ────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  /** Активность с учётом query (?section=...) */
  matchSection?: string
  /** Подпункты, раскрываются под активным родителем. */
  children?: NavItem[]
}

// Shared for all roles
const settingsChildren: NavItem[] = [
  { href: '/dashboard/settings?section=profile',       label: 'Профиль',      icon: <User className="w-3.5 h-3.5" />,        matchSection: 'profile' },
  { href: '/dashboard/settings?section=security',      label: 'Безопасность', icon: <Shield className="w-3.5 h-3.5" />,      matchSection: 'security' },
  { href: '/dashboard/settings?section=verification',  label: 'Верификация',  icon: <ShieldCheck className="w-3.5 h-3.5" />, matchSection: 'verification' },
  { href: '/dashboard/settings?section=notifications', label: 'Уведомления',  icon: <Bell className="w-3.5 h-3.5" />,        matchSection: 'notifications' },
  { href: '/dashboard/settings?section=account',       label: 'Аккаунт',      icon: <Trash2 className="w-3.5 h-3.5" />,      matchSection: 'account' },
]

const commonItems: NavItem[] = [
  { href: '/dashboard',          label: 'Обзор',     icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/dashboard/profile',  label: 'Профиль',   icon: <User className="w-4 h-4" /> },
  { href: '/dashboard/chat',     label: 'Чат',        icon: <MessageSquare className="w-4 h-4" /> },
  { href: '/dashboard/settings', label: 'Настройки', icon: <Settings className="w-4 h-4" />, children: settingsChildren },
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

function useStrippedPath() {
  const pathname = usePathname()
  return pathname.replace(/^\/(ru|en|kz)/, '') || '/'
}

function NavLink({ item }: { item: NavItem }) {
  const stripped = useStrippedPath()
  const isActive = stripped === item.href || (item.href !== '/dashboard' && stripped.startsWith(item.href))

  // Базовый href без query — для сравнения активности подпункта
  const baseHref = item.href.split('?')[0]
  const sectionMatch = item.matchSection
  const currentSection = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('section')
    : null
  const subActive = sectionMatch != null
    && stripped === baseHref
    && (currentSection === sectionMatch || (!currentSection && sectionMatch === 'profile'))

  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[13px] transition-all duration-200 group tracking-caption',
        sectionMatch ? 'ml-6 pl-3 text-[12px]' : '',
        (sectionMatch ? subActive : isActive)
          ? 'text-text-base bg-bg-active font-[510] border border-border'
          : 'text-text-muted hover:text-text-base hover:bg-bg-hover font-[400]',
      )}
    >
      {(sectionMatch ? subActive : isActive) && !sectionMatch && (
        <motion.div
          layoutId="sidebar-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4/5 bg-[#7170ff] rounded-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          layout="position"
        />
      )}
      <span className={cn((sectionMatch ? subActive : isActive) ? 'text-[#a8a6ff]' : 'text-text-faint group-hover:text-text-muted transition-colors')}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7170ff] px-1 text-[10px] font-semibold text-white">
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </Link>
  )
}

function NavGroup({ item }: { item: NavItem }) {
  const stripped = useStrippedPath()
  const isParentActive = stripped === item.href || (item.href !== '/dashboard' && stripped.startsWith(item.href))
  const expanded = isParentActive

  return (
    <>
      <NavLink item={item} />
      {expanded && item.children && (
        <div className="flex flex-col gap-0.5 mt-0.5 mb-1">
          {item.children.map(c => <NavLink key={c.href} item={c} />)}
        </div>
      )}
    </>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { user, logout } = useAuth()
  const router = useLocaleRouter()
  const logoSrc = LOGO_SRC

  const roleItems = user?.accountType === 'Developer' ? developerItems : clientItems
  const roleLabel = user?.accountType === 'Developer' ? '👨‍💻 Разработчик' : '💼 Заказчик'

  // Бейдж непрочитанных для "Чат" — поллинг API раз в 10с
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    if (!user?.profileId) return
    let cancelled = false
    const tick = async () => {
      const n = await unreadCountFor(user.profileId)
      if (!cancelled) setUnread(n)
    }
    tick()
    const t = setInterval(tick, 10000)
    return () => { cancelled = true; clearInterval(t) }
  }, [user?.profileId])

  const commonItemsWithBadge = commonItems.map(it =>
    it.href === '/dashboard/chat' ? { ...it, badge: unread } : it,
  )

  const handleLogout = async () => {
    await logout()
    router.push('/auth?mode=login')
  }

  return (
    <aside className="w-60 shrink-0 h-screen bg-bg-panel border-r border-border flex flex-col">

      {/* ── Logo ── */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <Link href="/" className="flex items-center group">
          <div className="relative h-7 w-32">
            <Image
              src={logoSrc}
              alt="Barnamaj"
              fill
              unoptimized
              className="object-contain object-left drop-shadow-[0_0_6px_rgba(113,112,255,0.45)]"
            />
          </div>
        </Link>
        <NotificationBell />
      </div>

      {/* ── User card ── */}
      <div className="px-3 py-4 border-b border-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-[8px] bg-bg-card border border-border">
          <div className="w-8 h-8 rounded-[6px] bg-accent/15 border border-border flex items-center justify-center text-sm font-[510] text-[#a8a6ff] shrink-0 select-none">
            {user?.profileName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-[510] text-text-base truncate tracking-caption">{user?.profileName}</p>
            <p className="text-[11px] text-text-faint truncate">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {/* Common */}
        {commonItemsWithBadge.map(item =>
          item.children
            ? <NavGroup key={item.href} item={item} />
            : <NavLink key={item.href} item={item} />,
        )}

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
