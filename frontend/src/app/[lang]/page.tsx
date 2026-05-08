'use client'

import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import Link from '@/components/ui/LocaleLink'
import Image from 'next/image'
import {
  Shield, Users, Briefcase, TrendingUp,
  ArrowRight, Lock, Zap, Hexagon,
  ChevronRight, ChevronLeft, Megaphone,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useLang } from '@/context/LangContext'

const Footer = lazy(() => import('@/components/Footer'))

const LOGO_SRC = '/logo.png'

/* ═══════════════════════════════════════════════════════════════════════════════
   ORNAMENT — Kazakh "ою" patterns as thin SVG geometrics ("Digital Steppe")
   ═══════════════════════════════════════════════════════════════════════════════ */

/** Repeating "қошқар мүйіз" (ram‑horn) pattern — 60×60 tile */
function OrnamentGrid({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="kaz-orn" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          {/* Ram-horn spiral (qoshqar muiiz) — simplified geometric */}
          <path
            d="M15 30 Q15 15 30 15 Q45 15 45 30 Q45 45 30 45 Q15 45 15 30Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.12"
          />
          {/* Inner diamond "тумарша" */}
          <path
            d="M30 20 L40 30 L30 40 L20 30Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.4"
            opacity="0.08"
          />
          {/* Corner tüiretam marks */}
          <path d="M0 0L6 0L0 6Z" fill="currentColor" opacity="0.04" />
          <path d="M60 0L54 0L60 6Z" fill="currentColor" opacity="0.04" />
          <path d="M0 60L6 60L0 54Z" fill="currentColor" opacity="0.04" />
          <path d="M60 60L54 60L60 54Z" fill="currentColor" opacity="0.04" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kaz-orn)" />
    </svg>
  )
}

/** Decorative border corners — "бұтақ ою" style */
function OrnamentCorner({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 40 C4 20 20 4 40 4 C60 4 76 20 76 40"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.2"
      />
      <path
        d="M12 40 C12 24 24 12 40 12 C56 12 68 24 68 40"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.15"
      />
      <circle cx="40" cy="4" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="40" cy="40" r="1.5" fill="currentColor" opacity="0.15" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER  — smooth count-up
   ═══════════════════════════════════════════════════════════════════════════════ */

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const mv     = useMotionValue(0)
  const spring  = useSpring(mv, { stiffness: 40, damping: 20 })
  const display = useTransform(spring, (v) =>
    Math.round(v).toLocaleString('ru-RU')
  )

  useEffect(() => { mv.set(value) }, [value, mv])

  return (
    <motion.span>{display}</motion.span>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BENTO TILE — reusable floating card
   ═══════════════════════════════════════════════════════════════════════════════ */

function BentoTile({
  children,
  className = '',
  delay = 0,
  colSpan = '',
  rowSpan = '',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  colSpan?: string
  rowSpan?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      whileHover={{ y: -4, transition: { duration: 0.3 } }}
      className={`
        relative overflow-hidden rounded-[12px] border border-border
        bg-bg-card p-6 group
        hover:border-border-bright hover:bg-bg-elevated hover:shadow-card-hover
        transition-all duration-300
        ${colSpan} ${rowSpan} ${className}
      `}
    >
      {/* Ornamental corner accents */}
      <OrnamentCorner className="absolute -top-1 -left-1 w-12 h-12 text-accent/30 pointer-events-none" />
      <OrnamentCorner className="absolute -bottom-1 -right-1 w-12 h-12 text-accent/30 rotate-180 pointer-events-none" />
      {children}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ESCROW ANIMATION — three-step visual
   ═══════════════════════════════════════════════════════════════════════════════ */

function EscrowAnimation({ labels }: { labels: [string, string, string] }) {
  const steps = [
    { icon: Lock, label: labels[0], color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    { icon: Shield, label: labels[1], color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
    { icon: Zap, label: labels[2], color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  ]

  return (
    <div className="flex flex-col gap-3">
      {steps.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.2, duration: 0.5 }}
          className={`flex items-center gap-3 rounded-xl border ${s.bg} px-4 py-3`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
            <s.icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${s.color}`}>{s.label}</p>
          </div>
          <span className="text-xs text-text-faint font-mono">0{i + 1}</span>
        </motion.div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CLAN VISUAL — hexagonal grid aesthetic
   ═══════════════════════════════════════════════════════════════════════════════ */

function ClanVisual({ membersLabel }: { membersLabel: string }) {
  const clans = [
    { name: 'Backend Guild', members: 12, color: 'border-accent/40 text-accent-light' },
    { name: 'Frontend Ops', members: 8, color: 'border-cyan-500/40 text-cyan-400' },
    { name: 'DevOps Core', members: 5, color: 'border-emerald-500/40 text-emerald-400' },
  ]

  return (
    <div className="space-y-3">
      {clans.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
          className={`flex items-center gap-3 rounded-xl border ${c.color} bg-bg-surface/50 px-4 py-3`}
        >
          <Hexagon className="w-5 h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{c.name}</p>
          </div>
          <span className="text-xs text-text-faint">{c.members} {membersLabel}</span>
        </motion.div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ANNOUNCEMENTS CAROUSEL
   ═══════════════════════════════════════════════════════════════════════════════ */

interface AnnouncementItem { id: string; title: string; body: string; published_at: string }

function AnnouncementsCarousel({ items }: { items: AnnouncementItem[] }) {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % items.length), 5000)
  }, [items.length])

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [resetTimer])

  const go = (dir: -1 | 1) => {
    setIdx(i => (i + dir + items.length) % items.length)
    resetTimer()
  }

  const item = items[idx]

  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="flex items-center gap-4 mb-8"
      >
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-accent-light" />
          <span className="text-xs font-mono text-text-faint tracking-widest">ОБЪЯВЛЕНИЯ</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </motion.div>

      <div className="relative rounded-2xl border border-border bg-bg-card overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

        <div className="p-6 sm:p-8 min-h-[140px] flex flex-col justify-center">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-lg font-bold text-text-base mb-2">{item.title}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{item.body}</p>
            <p className="text-xs text-text-faint mt-3">
              {new Date(item.published_at).toLocaleDateString('ru-RU')}
            </p>
          </motion.div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pb-4">
          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIdx(i); resetTimer() }}
                className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-accent-light' : 'bg-border'}`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={() => go(-1)} className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-faint">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => go(1)} className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-faint">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function HomePage() {
  const { t } = useLang()

  // ── Announcements ───────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])

  // ── Live stats from backend ──────────────────────────────
  const [stats, setStats] = useState({
    escrowTotal: 0,
    activeProjects: 0,
    verifiedTeams: 0,
  })

  const heroLogoSrc = LOGO_SRC

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
    async function loadStats() {
      try {
        const res = await fetch(`${API_URL}/api/stats`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setStats({
            escrowTotal: 0,  // эскроу-данные появятся когда будет реализован модуль платежей
            activeProjects: (data.activeOrders ?? 0),
            verifiedTeams: (data.clans ?? 0) + (data.companies ?? 0),
          })
        }
      } catch {
        // backend недоступен — показываем нули, страница не ломается
      }
    }
    loadStats()
  }, [])

  return (
    <div className="min-h-screen bg-bg-base relative">
      {/* ── Global ornament background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <OrnamentGrid className="text-accent w-full h-full" />
        {/* Radial mask so ornament fades from center */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 30%, transparent 0%, var(--bg-base) 70%)',
          }}
        />
      </div>

      <Navbar />

      <main className="relative z-10">
        {/* ═══════════════════════════════════════════════════════════
           HERO SECTION
           ═══════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 pt-20 pb-32">
          {/* Glow orbs */}
          <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />
          <div className="absolute top-[35%] left-[20%] w-80 h-80 rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(0,206,206,0.06) 0%, transparent 70%)' }} />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]"
          >
            <div className="space-y-8 text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,138,212,0.22)] bg-[rgba(99,138,212,0.08)] px-4 py-1.5 text-xs font-[510] tracking-[0.08em] text-[#bfd1ff]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t.hero.chip}
              </motion.div>

              <div className="max-w-[220px] sm:max-w-[320px] lg:max-w-[420px]">
                <Image
                  src={heroLogoSrc}
                  alt="Barnamaj"
                  width={1000}
                  height={320}
                  unoptimized
                  priority
                  className="h-auto w-full object-contain drop-shadow-[0_0_26px_rgba(73,71,171,0.32)]"
                />
              </div>

              <div className="space-y-5">
                <h1 className="max-w-[12ch] text-4xl font-semibold leading-[0.96] tracking-h1 sm:text-5xl lg:text-7xl lg:tracking-display">
                  <span className="text-gradient">
                    {t.hero.title2}
                  </span>
                  <span className="mt-3 block text-text-secondary text-xl sm:text-2xl lg:text-[30px] font-[400] tracking-h3">
                    {t.hero.title3}
                  </span>
                </h1>

                <p className="max-w-2xl text-text-secondary text-[15px] sm:text-base leading-8 tracking-body">
                  {t.hero.description}
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="flex flex-col sm:flex-row items-start gap-4"
              >
                <Link href="/auth?mode=register&type=Developer">
                  <button className="btn-primary flex items-center gap-2 px-8 py-4 text-base">
                    <Briefcase className="w-5 h-5" />
                    {t.hero.findProject}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/auth?mode=register&type=Client">
                  <button className="btn-ghost flex items-center gap-2 px-8 py-4 text-base">
                    <Users className="w-5 h-5" />
                    {t.hero.hireTeam}
                  </button>
                </Link>
              </motion.div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Shield, title: t.safeDeal.title, text: t.safeDeal.badge },
                  { icon: Users, title: t.clans.title, text: t.clans.members },
                  { icon: TrendingUp, title: t.stats.live, text: t.business.title },
                ].map(item => (
                  <div key={item.title} className="rounded-[14px] border border-border bg-bg-card p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-bg-panel">
                      <item.icon className="h-4 w-4 text-[#bfd1ff]" />
                    </div>
                    <p className="text-[13px] font-[510] tracking-caption text-text-base">{item.title}</p>
                    <p className="mt-1 text-xs leading-6 text-text-secondary">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[22px] border border-border bg-[linear-gradient(180deg,rgba(6,9,30,0.94),rgba(7,9,45,0.88))] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-text-faint">Barnamaj Control Layer</p>
                    <p className="mt-1 text-lg font-semibold tracking-h3 text-text-base">{t.stats.live}</p>
                  </div>
                  <div className="chip chip-accent">Live</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[14px] border border-[rgba(99,138,212,0.22)] bg-[rgba(99,138,212,0.08)] p-4">
                    <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-text-faint">{t.stats.projects}</p>
                    <p className="mt-2 text-[32px] font-semibold tracking-h2 text-[#d7e1ff] tabular-nums">
                      <AnimatedCounter value={stats.activeProjects} />
                    </p>
                  </div>
                  <div className="rounded-[14px] border border-[rgba(72,152,188,0.22)] bg-[rgba(72,152,188,0.08)] p-4">
                    <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-text-faint">{t.stats.companies}</p>
                    <p className="mt-2 text-[32px] font-semibold tracking-h2 text-[#a8e0ef] tabular-nums">
                      <AnimatedCounter value={stats.verifiedTeams} />
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[16px] border border-border bg-bg-card p-4">
                  <p className="text-[13px] font-[510] tracking-caption text-text-base">{t.safeDeal.title}</p>
                  <div className="mt-3 space-y-3">
                    {[
                      t.safeDeal.step1,
                      t.safeDeal.step2,
                      t.safeDeal.step3,
                    ].map((step, index) => (
                      <div key={step} className="flex items-center justify-between rounded-[10px] border border-border bg-bg-panel px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg-card text-[11px] font-[510] text-text-secondary">
                            0{index + 1}
                          </div>
                          <span className="text-sm text-text-secondary">{step}</span>
                        </div>
                        <Lock className="h-4 w-4 text-text-faint" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
           BENTO GRID
           ═══════════════════════════════════════════════════════════ */}
        <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-32">
          {/* Section ornament divider */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center gap-4 mb-12"
          >
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-xs font-mono text-text-faint tracking-widest">{t.nav.platform.toUpperCase()}</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">

            {/* ── 1. Live Stats — full width ── */}
            <BentoTile colSpan="lg:col-span-3" delay={0} className="!p-0 overflow-visible">
              <div className="relative p-6 sm:p-8">
                {/* Steppe ornament strip on top edge */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-accent-light" />
                  <h2 className="text-sm font-semibold text-text-base font-mono tracking-wide">{t.stats.live}</h2>
                  <span className="ml-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
                  <div className="rounded-[16px] border border-[rgba(73,71,171,0.22)] bg-[linear-gradient(180deg,rgba(73,71,171,0.10),rgba(76,63,150,0.08))] p-5 text-left">
                    <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-text-faint">{t.stats.escrow}</p>
                    <p className="mt-2 text-3xl sm:text-4xl font-semibold tracking-h2 text-[#cfc9ff] tabular-nums">
                      <AnimatedCounter value={stats.escrowTotal} /> <span className="text-lg">₸</span>
                    </p>
                    <p className="mt-3 text-sm leading-6 text-text-secondary">Protected settlement rail for higher-trust delivery workflows.</p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(72,152,188,0.22)] bg-[rgba(72,152,188,0.08)] p-5 text-left">
                    <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-text-faint">{t.stats.projects}</p>
                    <p className="mt-2 text-3xl sm:text-4xl font-semibold tracking-h2 text-[#a8e0ef] tabular-nums">
                      <AnimatedCounter value={stats.activeProjects} />
                    </p>
                    <p className="mt-3 text-sm leading-6 text-text-secondary">Спрос на исполнителей и команды в текущем окне активности.</p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(99,138,212,0.22)] bg-[rgba(99,138,212,0.08)] p-5 text-left">
                    <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-text-faint">{t.stats.companies}</p>
                    <p className="mt-2 text-3xl sm:text-4xl font-semibold tracking-h2 text-[#d7e1ff] tabular-nums">
                      <AnimatedCounter value={stats.verifiedTeams} />
                    </p>
                    <p className="mt-3 text-sm leading-6 text-text-secondary">Верифицированные составы и компании для серьёзных сделок.</p>
                  </div>
                </div>
              </div>
            </BentoTile>

            {/* ── 2. Safe Deal (Escrow) — takes 2 cols ── */}
            <BentoTile colSpan="md:col-span-1 lg:col-span-2" delay={0.1}>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent-light" />
                  <h3 className="text-lg font-bold text-text-base">{t.safeDeal.title}</h3>
                  <span className="ml-auto text-[10px] font-mono text-text-faint tracking-widest border border-border rounded-full px-2 py-0.5">{t.safeDeal.badge}</span>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">
                  {t.safeDeal.description}
                </p>
                <EscrowAnimation labels={[t.safeDeal.step1, t.safeDeal.step2, t.safeDeal.step3]} />
                <Link
                  href="/escrow"
                  className="inline-flex items-center gap-1.5 text-sm text-accent-light hover:text-accent-bright transition-colors"
                >
                  {t.safeDeal.more} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </BentoTile>

            {/* ── 3. Developer Clans ── */}
            <BentoTile colSpan="md:col-span-1 lg:col-span-1" delay={0.2}>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-text-base">{t.clans.title}</h3>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">
                  {t.clans.description}
                </p>
                <ClanVisual membersLabel={t.clans.members} />
              </div>
            </BentoTile>

            {/* ── 4. Technologies ── */}
            <BentoTile delay={0.25}>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-text-base">{t.tech.title}</h3>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">
                  {t.tech.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {['React', 'Node.js', 'Python', 'Go', 'Rust', 'SQL'].map(tag => (
                    <span
                      key={tag}
                      className="chip"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </BentoTile>

            {/* ── 5. For Business ── */}
            <BentoTile delay={0.3}>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-text-base">{t.business.title}</h3>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">
                  {t.business.description}
                </p>
                <Link
                  href="/auth?mode=register&type=Client"
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {t.business.start} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </BentoTile>

            {/* ── 6. CTA block — full width ── */}
            <BentoTile colSpan="lg:col-span-3" delay={0.35} className="!bg-gradient-to-br !from-accent/10 !to-bg-card !border-accent/20">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
                <div className="space-y-2 text-center sm:text-left">
                  <h3 className="text-xl font-bold text-text-base">{t.cta.title}</h3>
                  <p className="text-sm text-text-muted">
                    {t.cta.description}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Link href="/auth?mode=register&type=Developer">
                    <button className="btn-primary flex items-center gap-2 px-6 py-3 text-sm">
                      {t.cta.developer} <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link href="/auth?mode=register&type=Client">
                    <button className="btn-ghost flex items-center gap-2 px-6 py-3 text-sm">
                      {t.cta.client}
                    </button>
                  </Link>
                </div>
              </div>
            </BentoTile>
          </div>
        </section>
        {/* ═══════════════════════════════════════════════════════════
           PRICING PACKAGES
           ═══════════════════════════════════════════════════════════ */}
        <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center gap-4 mb-8"
          >
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-xs font-mono text-text-faint tracking-widest">ТАРИФЫ</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                tier: 1,
                title: 'Стартовый',
                range: 'до 100 000 ₸',
                fee: '600 ₸ фиксированная',
                color: 'border-[rgba(99,138,212,0.24)] bg-[rgba(99,138,212,0.08)]',
                accent: 'text-[#bfd1ff]',
                features: ['Быстрый запуск', 'Escrow-защита', 'Чат с исполнителем'],
              },
              {
                tier: 2,
                title: 'Бизнес',
                range: '100 001–500 000 ₸',
                fee: '1% от суммы',
                color: 'border-[rgba(122,88,172,0.24)] bg-[linear-gradient(180deg,rgba(73,71,171,0.10),rgba(122,88,172,0.08))]',
                accent: 'text-[#d8caef]',
                features: ['Всё из Стартового', 'Приоритетный поиск', 'Расширенные отклики'],
                popular: true,
              },
              {
                tier: 3,
                title: 'Корпоративный',
                range: 'от 500 001 ₸',
                fee: '10% включена в сумму',
                color: 'border-[rgba(72,152,188,0.24)] bg-[rgba(72,152,188,0.08)]',
                accent: 'text-[#a8e0ef]',
                features: ['Всё из Бизнес', 'Технический надзор', 'Распределение 90/3/7%'],
              },
            ].map(pkg => (
              <motion.div
                key={pkg.tier}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: pkg.tier * 0.1 }}
                className={`relative rounded-[18px] border p-6 space-y-5 shadow-[0_1px_0_rgba(255,255,255,0.03)] ${pkg.color}`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[rgba(122,88,172,0.30)] bg-[linear-gradient(135deg,#4947ab,#7a58ac)] px-3 py-0.5 text-xs font-[510] text-white">
                    Популярный
                  </span>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-[510] uppercase tracking-[0.08em] text-text-faint">Пакет {pkg.tier}</p>
                    <p className={`mt-2 text-xl font-semibold tracking-h3 ${pkg.accent}`}>{pkg.title}</p>
                    <p className="mt-1 text-sm text-text-secondary">{pkg.range}</p>
                  </div>
                  <div className="rounded-[10px] border border-border bg-bg-panel px-2.5 py-1 text-[11px] font-[510] tracking-caption text-text-secondary">
                    SLA-ready
                  </div>
                </div>
                <p className="text-2xl font-semibold tracking-h3 text-text-base">{pkg.fee}</p>
                <ul className="space-y-3">
                  {pkg.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-text-secondary">
                      <span className={`h-2 w-2 rounded-full ${pkg.accent.replace('text-[', 'bg-[').replace(']', ']')}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="rounded-[12px] border border-border bg-bg-panel px-3 py-2.5 text-xs leading-6 text-text-faint">
                  Подходит для сценариев с растущей стоимостью сделки и более высоким уровнем контроля исполнения.
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
           ANNOUNCEMENTS CAROUSEL
           ═══════════════════════════════════════════════════════════ */}
        {announcements.length > 0 && <AnnouncementsCarousel items={announcements} />}
      </main>

      <Suspense fallback={<div className="h-40" />}>
        <Footer />
      </Suspense>
    </div>
  )
}
