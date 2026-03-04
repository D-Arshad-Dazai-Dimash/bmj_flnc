'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import Link from '@/components/ui/LocaleLink'
import Image from 'next/image'
import {
  Shield, Users, Briefcase, TrendingUp,
  ArrowRight, Lock, Zap, Hexagon,
  ChevronRight,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LangContext'

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
        relative overflow-hidden rounded-2xl border border-border
        bg-bg-card p-6 group
        hover:border-accent/30 hover:shadow-card-hover
        transition-shadow duration-500
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
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function HomePage() {
  const { t } = useLang()
  const supabase = useMemo(() => createClient(), [])

  // ── Live stats from Supabase ──────────────────────────────
  const [stats, setStats] = useState({
    escrowTotal: 0,
    activeProjects: 0,
    verifiedTeams: 0,
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const [escrowRes, projRes, teamsRes] = await Promise.all([
          supabase.from('contracts').select('amount'),
          supabase.from('projects').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
        ])

        const escrowTotal = (escrowRes.data ?? []).reduce(
          (sum: number, c: { amount: number }) => sum + (c.amount ?? 0),
          0
        )

        setStats({
          escrowTotal,
          activeProjects: projRes.count ?? 0,
          verifiedTeams: teamsRes.count ?? 0,
        })
      } catch {
        // Supabase недоступен — показываем нули, страница не ломается
      }
    }
    loadStats()
  }, [supabase])

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
            className="max-w-4xl mx-auto text-center space-y-8"
          >
            {/* Mono chip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/5 text-xs font-mono text-accent-light"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t.hero.chip}
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              <span className="text-text-base">{t.hero.title1}</span>
              <br />
              <span className="text-gradient">
                {t.hero.title2}
              </span>
              <br />
              <span className="text-text-muted text-2xl sm:text-3xl lg:text-4xl font-medium">
                {t.hero.title3}
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-text-muted text-base sm:text-lg leading-relaxed">
              {t.hero.description}
            </p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
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

            {/* Decorative ornament line */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 1 }}
              className="mx-auto w-48"
            >
              <svg viewBox="0 0 200 12" className="text-accent/20 w-full">
                <path d="M0 6 L20 1 L40 6 L60 1 L80 6 L100 1 L120 6 L140 1 L160 6 L180 1 L200 6" stroke="currentColor" strokeWidth="0.8" fill="none" />
                <circle cx="100" cy="6" r="3" fill="currentColor" opacity="0.3" />
              </svg>
            </motion.div>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Escrow total */}
                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 text-center space-y-1">
                    <p className="text-3xl sm:text-4xl font-bold text-accent-light tabular-nums">
                      <AnimatedCounter value={stats.escrowTotal} /> <span className="text-lg">₸</span>
                    </p>
                    <p className="text-xs text-text-muted">{t.stats.escrow}</p>
                  </div>
                  {/* Active projects */}
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 text-center space-y-1">
                    <p className="text-3xl sm:text-4xl font-bold text-cyan-400 tabular-nums">
                      <AnimatedCounter value={stats.activeProjects} />
                    </p>
                    <p className="text-xs text-text-muted">{t.stats.projects}</p>
                  </div>
                  {/* Verified teams */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center space-y-1">
                    <p className="text-3xl sm:text-4xl font-bold text-emerald-400 tabular-nums">
                      <AnimatedCounter value={stats.verifiedTeams} />
                    </p>
                    <p className="text-xs text-text-muted">{t.stats.companies}</p>
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
                      className="text-xs px-2.5 py-1 rounded-lg border border-border bg-bg-surface text-text-muted"
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
      </main>

      <Footer />
    </div>
  )
}
