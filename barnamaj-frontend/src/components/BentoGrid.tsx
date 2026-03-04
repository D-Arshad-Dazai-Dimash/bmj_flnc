'use client'

import { motion } from 'framer-motion'
import {
  BriefcaseIcon,
  Code2,
  ArrowRight,
  CheckCircle2,
  Star,
  Users,
  TrendingUp,
  CircuitBoard,
} from 'lucide-react'

interface BentoGridProps {
  onRegisterClick: (type: 'Client' | 'Developer') => void
}

const clientFeatures = [
  'Поиск верифицированных исполнителей',
  'Гарантированная защита оплаты',
  'Прозрачная история проектов',
  'Рейтинг и отзывы кланов',
]

const developerFeatures = [
  'Вступай в элитные кланы',
  'Подтверждай навыки тестами',
  'Получай лучшие заказы',
  'Расти в системе рейтинга',
]

export default function BentoGrid({ onRegisterClick }: BentoGridProps) {
  return (
    <section id="clans" className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm text-accent-light font-medium uppercase tracking-widest mb-3">
            Для всех участников
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Выберите свой путь
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            Barnamaj создан для двух сторон — мы даём каждой максимум инструментов
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Я Заказчик */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="group relative rounded-2xl p-8 flex flex-col justify-between min-h-[420px] cursor-pointer overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #13111f 0%, #0f0d1a 100%)',
              border: '1px solid rgba(124,58,237,0.2)',
            }}
            onClick={() => onRegisterClick('Client')}
          >
            {/* Hover glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
              style={{
                boxShadow: 'inset 0 0 60px rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.4)',
              }}
            />

            {/* Background pattern */}
            <div
              className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 80% 20%, rgba(124,58,237,0.5) 0%, transparent 60%)',
              }}
            />

            {/* Top icon */}
            <div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}
              >
                <BriefcaseIcon className="w-7 h-7 text-accent-light" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium uppercase tracking-widest text-accent-light/70">
                  Заказчик
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Я Заказчик</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Находи проверенные команды разработчиков. Запускай проекты
                быстро и безопасно с полной защитой сделок.
              </p>

              <ul className="space-y-2.5">
                {clientFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-accent-light flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom CTA */}
            <div className="flex items-center justify-between mt-8">
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> 200+ клиентов
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500/70" /> 4.9 рейтинг
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-accent-light group-hover:gap-2.5 transition-all duration-300">
                Начать <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>

          {/* Card: Я Разработчик */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            className="group relative rounded-2xl p-8 flex flex-col justify-between min-h-[420px] cursor-pointer overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #0d1a1f 0%, #0a1518 100%)',
              border: '1px solid rgba(6,182,212,0.2)',
            }}
            onClick={() => onRegisterClick('Developer')}
          >
            {/* Hover glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
              style={{
                boxShadow: 'inset 0 0 60px rgba(6,182,212,0.1)',
                border: '1px solid rgba(6,182,212,0.4)',
              }}
            />

            {/* Background glow */}
            <div
              className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 80% 20%, rgba(6,182,212,0.5) 0%, transparent 60%)',
              }}
            />

            {/* Top icon */}
            <div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)' }}
              >
                <CircuitBoard className="w-7 h-7 text-cyan-400" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium uppercase tracking-widest text-cyan-400/70">
                  Разработчик
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Я Разработчик</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Вступай в клан, подтверждай навыки и работай над лучшими
                проектами. Система репутации, которая работает на тебя.
              </p>

              <ul className="space-y-2.5">
                {developerFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <Code2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom CTA */}
            <div className="flex items-center justify-between mt-8">
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> 500+ девов
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-500/70" /> Топ рейтинг
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-cyan-400 group-hover:gap-2.5 transition-all duration-300">
                Вступить <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
