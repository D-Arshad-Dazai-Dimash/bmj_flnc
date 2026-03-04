'use client'

import { useState } from 'react'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Lock, ArrowRight,
  Cpu, Users, Star, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PortalFeature { icon: React.ElementType; text: string; sub?: string }
interface PortalConfig {
  id: 'business' | 'talent'
  variant: 'purple' | 'cyan'
  label: string
  headline: string
  tagline: string
  features: PortalFeature[]
  cta: string
  ctaHref: string
  accentColor: string
  secondaryColor: string
  glowColor: string
  borderColor: string
  bgGradient: string
  iconBg: string
  badgeBg: string
  badgeText: string
  statLabel: string
  statValue: string
}

// ─── Portal data ──────────────────────────────────────────────────────────────
const portals: PortalConfig[] = [
  {
    id: 'business',
    variant: 'purple',
    label: 'ДЛЯ БИЗНЕСА',
    headline: 'Верифицированные команды',
    tagline: 'Нанимайте элиту. Платите безопасно.',
    features: [
      { icon: ShieldCheck, text: 'Верифицированные команды', sub: 'Каждый разработчик проверен техническими тестами' },
      { icon: Lock,        text: 'Эскроу-защита сделок',      sub: 'Деньги переходят исполнителю только после приёмки' },
      { icon: Star,        text: 'Рейтинг и репутация',       sub: 'Прозрачная история всех выполненных проектов' },
    ],
    cta: 'Найти команду',
    ctaHref: '/auth?mode=register&type=Client',
    accentColor: '#a78bfa',
    secondaryColor: '#7c3aed',
    glowColor: 'rgba(124,58,237,0.5)',
    borderColor: 'rgba(124,58,237,0.25)',
    bgGradient: 'linear-gradient(145deg, #0f0c1e 0%, #0a0815 60%, #070510 100%)',
    iconBg: 'rgba(124,58,237,0.12)',
    badgeBg: 'rgba(124,58,237,0.1)',
    badgeText: '#a78bfa',
    statLabel: 'Успешных проектов',
    statValue: '2,400+',
  },
  {
    id: 'talent',
    variant: 'cyan',
    label: 'ДЛЯ ТАЛАНТОВ',
    headline: 'Кланы. Сложные задачи.',
    tagline: 'Кодируйте в лиге лучших.',
    features: [
      { icon: Users, text: 'Клановая система',   sub: 'Объединяйтесь в команды по стеку и специализации' },
      { icon: Cpu,   text: 'Сложные задачи',      sub: 'Только реальные проекты с достойным вознаграждением' },
      { icon: Star,  text: 'XP и бейджи',         sub: 'Система прокачки навыков с публичным профилем' },
    ],
    cta: 'Вступить в клан',
    ctaHref: '/auth?mode=register&type=Developer',
    accentColor: '#22d3ee',
    secondaryColor: '#0891b2',
    glowColor: 'rgba(0,212,255,0.45)',
    borderColor: 'rgba(0,212,255,0.2)',
    bgGradient: 'linear-gradient(145deg, #071419 0%, #050e10 60%, #030a0c 100%)',
    iconBg: 'rgba(0,212,255,0.1)',
    badgeBg: 'rgba(0,212,255,0.08)',
    badgeText: '#67e8f9',
    statLabel: 'Разработчиков',
    statValue: '500+',
  },
]

// ─── Single portal card ───────────────────────────────────────────────────────
function PortalCard({ p, index }: { p: PortalConfig; index: number }) {
  const [hovered, setHovered]     = useState(false)
  const [expanded, setExpanded]   = useState<number | null>(null)
  const router = useLocaleRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: index * 0.15 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-2xl overflow-hidden cursor-default"
      style={{
        background: p.bgGradient,
        border: `1px solid ${hovered ? p.glowColor : p.borderColor}`,
        boxShadow: hovered
          ? `0 0 50px ${p.glowColor}, inset 0 0 40px rgba(0,0,0,0.3)`
          : '0 4px 40px rgba(0,0,0,0.5)',
        transition: 'border-color 0.4s, box-shadow 0.4s',
      }}
    >
      {/* Glow orb */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0.3, scale: hovered ? 1.15 : 1 }}
        transition={{ duration: 0.5 }}
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${p.glowColor} 0%, transparent 70%)` }}
      />

      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none scanlines opacity-60" />

      {/* Content */}
      <div className="relative z-10 p-8 flex flex-col gap-6">

        {/* Badge + stat */}
        <div className="flex items-center justify-between">
          <span
            className="px-3 py-1 rounded-full text-[11px] font-mono font-semibold tracking-widest uppercase"
            style={{ background: p.badgeBg, color: p.badgeText, border: `1px solid ${p.borderColor}` }}
          >
            {p.label}
          </span>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: p.accentColor }}>{p.statValue}</p>
            <p className="text-[10px] text-text-faint font-mono tracking-wider uppercase">{p.statLabel}</p>
          </div>
        </div>

        {/* Headline */}
        <div>
          <h3
            className="text-3xl font-bold leading-tight"
            style={{
              background: `linear-gradient(135deg, #fff 0%, ${p.accentColor} 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            {p.headline}
          </h3>
          <p className="mt-2 text-sm text-text-muted">{p.tagline}</p>
        </div>

        {/* Features — expandable */}
        <ul className="flex flex-col gap-2">
          {p.features.map((f, i) => {
            const Icon = f.icon
            const open = expanded === i
            return (
              <li key={f.text}>
                <button
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left',
                    'transition-all duration-200',
                    open ? 'bg-white/5' : 'hover:bg-white/[0.03]'
                  )}
                  onClick={() => setExpanded(open ? null : i)}
                >
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: p.iconBg, border: `1px solid ${p.borderColor}` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: p.accentColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-base">{f.text}</span>
                    <AnimatePresence>
                      {open && f.sub && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-xs text-text-muted mt-1 overflow-hidden"
                        >
                          {f.sub}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <ChevronDown
                    className="flex-shrink-0 w-3.5 h-3.5 text-text-faint transition-transform mt-1"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
              </li>
            )
          })}
        </ul>

        {/* CTA */}
        <motion.button
          onClick={() => router.push(p.ctaHref)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 mt-2"
          style={{
            background: `linear-gradient(135deg, ${p.secondaryColor}, ${p.accentColor}30)`,
            border: `1px solid ${p.borderColor}`,
            color: p.accentColor,
            boxShadow: hovered ? `0 0 20px ${p.glowColor}` : 'none',
          }}
        >
          {p.cta}
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
export default function PortalCards() {
  return (
    <section id="portals" className="relative py-28 px-4">
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <p className="label-terminal mb-3">Выбери свой путь</p>
        <h2 className="text-4xl md:text-5xl font-bold">
          <span className="text-text-base">Два мира. </span>
          <span className="text-gradient">Одна платформа.</span>
        </h2>
      </motion.div>

      {/* Cards grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {portals.map((p, i) => (
          <PortalCard key={p.id} p={p} index={i} />
        ))}
      </div>
    </section>
  )
}
