'use client'

import { motion } from 'framer-motion'
import Link from '@/components/ui/LocaleLink'
import { ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Animation variants ───────────────────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}
const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 1, ease: 'easeOut' } },
}

// ─── Accent chip data ─────────────────────────────────────────────────────────
const chips = [
  { label: 'Верификация навыков', color: 'purple' },
  { label: 'Кланы разработчиков', color: 'cyan' },
  { label: 'Эскроу-защита',       color: 'purple' },
]

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-16 pb-24">

      {/* ── Background: grid ── */}
      <div
        className="absolute inset-0 bg-grid-pattern bg-grid opacity-100 pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 10%, transparent 80%)' }}
      />

      {/* ── Background: main glow ── */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="show"
        className="absolute pointer-events-none"
        style={{
          top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, rgba(124,58,237,0.04) 45%, transparent 70%)',
          filter: 'blur(1px)',
        }}
      />

      {/* ── Background: secondary glow ── */}
      <div
        className="absolute top-1/3 left-1/4 w-72 h-72 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
        }}
      />

      {/* ── Content ── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-7"
      >
        {/* Status badge */}
        <motion.div variants={item}>
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border border-accent/30 text-accent-light tracking-widest uppercase"
            style={{ background: 'rgba(124,58,237,0.08)' }}
          >
            <Zap className="w-3 h-3" />
            v2 — Premium Dark Tech
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter leading-none"
        >
          <span className="text-text-base block">Barnamaj</span>
          <span className="text-gradient block mt-2">Профессиональный кодинг.</span>
          <span
            className="block mt-2 text-text-muted"
            style={{ fontSize: '0.65em', fontWeight: 500, letterSpacing: '0.02em' }}
          >
            Без лишних слов.
          </span>
        </motion.h1>

        {/* Chips */}
        <motion.div variants={item} className="flex flex-wrap justify-center gap-2">
          {chips.map(({ label, color }) => (
            <span
              key={label}
              className="px-3 py-1 rounded-full text-xs border"
              style={
                color === 'purple'
                  ? { borderColor: 'rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.08)', color: '#a78bfa' }
                  : { borderColor: 'rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.07)', color: '#67e8f9' }
              }
            >
              {label}
            </span>
          ))}
        </motion.div>

        {/* CTA row */}
        <motion.div variants={item} className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/auth?mode=register">
            <Button variant="default" size="lg" className="group">
              Начать
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="#portals">
            <Button variant="outline" size="lg">
              Узнать больше
            </Button>
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          variants={item}
          className="flex items-center gap-8 pt-4 border-t border-border/50"
        >
          {[
            { val: '500+',  label: 'Девелоперов' },
            { val: '120+',  label: 'Активных кланов' },
            { val: '98%',   label: 'Успешных сделок' },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-text-base shimmer-text">{val}</p>
              <p className="text-[11px] text-text-muted mt-0.5 label-terminal">{label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Bottom fade ── */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-bg-base to-transparent pointer-events-none" />
    </section>
  )
}
