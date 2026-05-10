'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from '@/components/ui/LocaleLink'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import NotificationBell from '@/components/dashboard/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const LOGO_SRC = '/logoBarnamajMini.png'

const navLinks = [
  { href: '#portals',  label: 'Решения' },
  { href: '#features', label: 'Платформа' },
]

export default function Navbar() {
  const { isAuthenticated, user, logout, isLoading } = useAuth()
  const router = useLocaleRouter()

  const logoSrc = LOGO_SRC
  const [scrolled,  setScrolled]  = useState(false)
  const [visible,   setVisible]   = useState(true)
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [userMenu,  setUserMenu]  = useState(false)
  const lastYRef   = useRef(0)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 30)
      setVisible(y < 60 || y < lastYRef.current)
      lastYRef.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    setUserMenu(false)
    router.push('/auth?mode=login')
  }

  return (
    <>
      <motion.header
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: visible ? 0 : -64, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'fixed top-0 inset-x-0 z-50 h-16 flex items-center transition-all duration-300',
          scrolled
            ? 'glass border-b border-border shadow-[0_1px_0_rgba(255,255,255,0.04),0_8px_48px_rgba(0,0,0,0.7)]'
            : 'bg-transparent border-b border-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex items-center justify-between">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-3 group select-none">
            <div className="relative w-7 h-7">
              <Image
                src={logoSrc}
                alt="Barnamaj"
                fill
                sizes="28px"
                unoptimized
                className="object-contain drop-shadow-[0_0_8px_rgba(113,112,255,0.5)]"
                priority
              />
            </div>
            <span className="text-[15px] font-semibold tracking-h3 text-text-base group-hover:text-gradient transition-all">
              Barnamaj
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3.5 py-1.5 text-[13px] font-[510] text-text-muted hover:text-text-base rounded-md hover:bg-bg-hover transition-all duration-200 tracking-caption"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── Right side ── */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-bg-card animate-pulse" />
            ) : isAuthenticated && user ? (
              /* ── User dropdown ── */
              <>
              <NotificationBell />
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenu(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-border hover:border-border-bright bg-bg-card hover:bg-bg-elevated transition-all duration-200"
                >
                  <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-accent-light select-none">
                    {user.profileName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="text-sm text-text-base font-medium max-w-[120px] truncate">
                    {user.profileName}
                  </span>
                  <ChevronDown className={cn('w-3.5 h-3.5 text-text-muted transition-transform duration-200', userMenu && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {userMenu && (
                    <motion.div
                      className="absolute right-0 top-full mt-2 w-52 bg-bg-panel border border-border rounded-[10px] shadow-elevated overflow-hidden"
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="px-3 py-2.5 border-b border-border">
                        <p className="text-sm font-medium text-text-base truncate">{user.profileName}</p>
                        <p className="text-xs text-text-muted truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-xs text-accent-light">
                          {user.accountType === 'Developer' ? '👨‍💻 Разработчик' : '💼 Заказчик'}
                        </span>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-muted hover:text-text-base hover:bg-bg-hover transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Дашборд
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Выйти
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </>
            ) : (
              /* ── Guest CTA ── */
              <>
                <Link href="/auth?mode=login">
                  <Button variant="ghost" size="sm">Войти</Button>
                </Link>
                <Link href="/auth?mode=register">
                  <Button variant="default" size="sm">Начать работу</Button>
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile toggle ── */}
          <button
            className="md:hidden p-2 text-text-muted hover:text-text-base transition-colors"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Меню"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.header>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 glass border-b border-border/60 md:hidden"
          >
            <nav className="flex flex-col p-4 gap-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 text-sm text-text-muted hover:text-text-base hover:bg-bg-hover rounded-md transition-colors"
                >
                  {label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-border">
                {isAuthenticated ? (
                  <>
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                      <Button variant="outline" size="md" className="w-full">Дашборд</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="md"
                      className="w-full text-red-400 hover:text-red-300"
                      onClick={() => { handleLogout(); setMenuOpen(false) }}
                    >
                      Выйти
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/auth?mode=login" onClick={() => setMenuOpen(false)}>
                      <Button variant="outline" size="md" className="w-full">Войти</Button>
                    </Link>
                    <Link href="/auth?mode=register" onClick={() => setMenuOpen(false)}>
                      <Button variant="default" size="md" className="w-full">Начать работу</Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
