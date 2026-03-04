'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Code2, Zap, Shield } from 'lucide-react'

interface HeroSectionProps {
  onRegisterClick: () => void
  onLoginClick: () => void
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut', delay },
  }),
}

const chips = [
  { icon: Shield, label: 'Верификация навыков' },
  { icon: Code2, label: 'Умные контракты' },
  { icon: Zap, label: 'Клановая система' },
]

export default function HeroSection({ onRegisterClick, onLoginClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-16">
      {/* Background glow blobs */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.04) 50%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center space-y-8 z-10">
        {/* Badge */}
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-accent/30 bg-accent/10 text-accent-light"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-light animate-pulse" />
          Платформа нового поколения
        </motion.div>

        {/* Main Title */}
        <motion.h1
          variants={fadeUp}
          custom={0.1}
          initial="hidden"
          animate="visible"
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight"
        >
          <span className="text-white">Barnamaj:</span>
          <br />
          <span
            className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent"
          >
            Экосистема элитного
          </span>
          <br />
          <span className="text-white">программирования</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          custom={0.2}
          initial="hidden"
          animate="visible"
          className="max-w-2xl mx-auto text-lg text-zinc-400 leading-relaxed"
        >
          Объединяем лучших разработчиков и заказчиков в единой экосистеме.
          Кланы, верификация навыков и прозрачные смарт-контракты.
        </motion.p>

        {/* Feature chips */}
        <motion.div
          variants={fadeUp}
          custom={0.3}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {chips.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300"
            >
              <Icon className="w-3.5 h-3.5 text-accent-light" />
              {label}
            </div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeUp}
          custom={0.4}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={onRegisterClick}
            className="group relative px-8 py-3.5 rounded-xl text-white font-semibold text-sm overflow-hidden transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              boxShadow: '0 0 30px rgba(124,58,237,0.35)',
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              Начать бесплатно
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
            />
          </button>

          <button
            onClick={onLoginClick}
            className="px-8 py-3.5 rounded-xl text-zinc-300 font-semibold text-sm border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all duration-300"
          >
            Уже есть аккаунт
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          variants={fadeUp}
          custom={0.5}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-center gap-8 pt-4"
        >
          {[
            { value: '500+', label: 'Разработчиков' },
            { value: '120+', label: 'Кланов' },
            { value: '2400+', label: 'Проектов' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  )
}
