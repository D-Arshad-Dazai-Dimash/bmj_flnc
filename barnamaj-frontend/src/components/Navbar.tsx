'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavbarProps {
  onLoginClick: () => void
  onRegisterClick: () => void
}

const navLinks = [
  { label: 'Возможности', href: '#features' },
  { label: 'Кланы', href: '#clans' },
  { label: 'Разработчикам', href: '#developers' },
  { label: 'Заказчикам', href: '#clients' },
]

export default function Navbar({ onLoginClick, onRegisterClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-black/70 backdrop-blur-xl border-b border-border shadow-lg'
            : 'bg-transparent border-b border-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="Barnamaj"
                  fill
                  className="object-contain"
                  priority
                  onError={(e) => {
                    // Fallback if logo.png not found
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
                {/* Fallback icon */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-light opacity-0"
                  style={{ opacity: 0 }}
                  id="logo-fallback"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="text-white font-semibold text-lg tracking-tight">
                Barnamaj
              </span>
            </a>

            {/* Nav Links (desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors duration-200 rounded-md hover:bg-white/5"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* CTA Buttons (desktop) */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={onLoginClick}
                className="px-4 py-1.5 text-sm text-zinc-300 hover:text-white transition-colors duration-200 hover:bg-white/5 rounded-md"
              >
                Войти
              </button>
              <button
                onClick={onRegisterClick}
                className="relative px-4 py-1.5 text-sm font-medium text-white rounded-lg overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  boxShadow: '0 0 20px rgba(124,58,237,0.3)',
                }}
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Создать Клан
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 bg-black/95 backdrop-blur-xl border-b border-border md:hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 flex flex-col gap-2 border-t border-border mt-3">
                <button
                  onClick={() => { setMobileOpen(false); onLoginClick() }}
                  className="w-full px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-md transition-colors text-left"
                >
                  Войти
                </button>
                <button
                  onClick={() => { setMobileOpen(false); onRegisterClick() }}
                  className="w-full px-4 py-2 text-sm font-medium text-white rounded-lg text-center"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  Создать Клан
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
