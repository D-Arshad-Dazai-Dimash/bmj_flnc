'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { locales } from '@/lib/i18n'

const LANG_LABELS: Record<string, { short: string; full: string }> = {
  kz: { short: 'Qaz', full: 'Қазақша' },
  ru: { short: 'Rus', full: 'Русский' },
  en: { short: 'Eng', full: 'English' },
}

export default function LanguageSwitcher() {
  const params = useParams<{ lang?: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const lang = params?.lang || 'ru'
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const switchTo = (newLang: string) => {
    // Replace current lang segment in pathname
    const segments = pathname.split('/')
    if (locales.includes(segments[1] as typeof locales[number])) {
      segments[1] = newLang
    } else {
      segments.splice(1, 0, newLang)
    }
    const newPath = segments.join('/') || '/'
    document.cookie = `NEXT_LOCALE=${newLang};path=/;max-age=31536000`
    // Client-side navigation — no full page reload
    router.push(newPath)
  }

  const current = LANG_LABELS[lang] ?? LANG_LABELS.ru

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all duration-200 text-sm',
          open
            ? 'border-accent/40 bg-accent/10 text-accent-light'
            : 'border-border bg-bg-card text-text-muted hover:border-border-bright hover:text-text-base'
        )}
        title="Язык / Language / Тіл"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="font-medium text-xs">{current.short}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-[calc(100%+6px)] w-40 rounded-xl border border-border bg-bg-surface shadow-2xl shadow-black/40 overflow-hidden z-50"
          >
            {locales.map(l => {
              const meta = LANG_LABELS[l]
              const isActive = l === lang
              return (
                <button
                  key={l}
                  onClick={() => { switchTo(l); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-accent/10 text-accent-light font-medium'
                      : 'text-text-muted hover:text-text-base hover:bg-bg-hover'
                  )}
                >
                  <span>{meta.full}</span>
                  <span className="text-xs text-text-faint font-mono">{meta.short}</span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
