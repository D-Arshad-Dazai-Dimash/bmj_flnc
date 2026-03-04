'use client'

import { motion } from 'framer-motion'
import {
  ShieldCheck,
  FileCode2,
  Users,
  BadgeCheck,
  Zap,
  Globe,
} from 'lucide-react'

const features = [
  {
    icon: ShieldCheck,
    title: 'Верификация навыков',
    description:
      'Каждый разработчик проходит технические тесты. Только подтверждённые специалисты получают бейджи и видимость заказчикам.',
    color: 'purple',
    gradient: 'from-violet-500/20 to-purple-500/5',
    iconBg: 'rgba(124,58,237,0.15)',
    iconBorder: 'rgba(124,58,237,0.3)',
    iconColor: '#a78bfa',
  },
  {
    icon: FileCode2,
    title: 'Умные контракты',
    description:
      'Прозрачные соглашения с защитой обеих сторон. Оплата зачисляется только после приёмки работы.',
    color: 'cyan',
    gradient: 'from-cyan-500/20 to-blue-500/5',
    iconBg: 'rgba(6,182,212,0.12)',
    iconBorder: 'rgba(6,182,212,0.3)',
    iconColor: '#22d3ee',
  },
  {
    icon: Users,
    title: 'Клановая система',
    description:
      'Объединяйтесь в кланы, разделяйте специализации, получайте командные проекты. Сила в числе.',
    color: 'purple',
    gradient: 'from-violet-500/20 to-purple-500/5',
    iconBg: 'rgba(124,58,237,0.15)',
    iconBorder: 'rgba(124,58,237,0.3)',
    iconColor: '#a78bfa',
  },
  {
    icon: BadgeCheck,
    title: 'Система репутации',
    description:
      'Рейтинги, отзывы и история проектов формируют честный профиль. Работа говорит за себя.',
    color: 'cyan',
    gradient: 'from-cyan-500/20 to-blue-500/5',
    iconBg: 'rgba(6,182,212,0.12)',
    iconBorder: 'rgba(6,182,212,0.3)',
    iconColor: '#22d3ee',
  },
  {
    icon: Zap,
    title: 'Быстрый подбор',
    description:
      'ИИ-алгоритм матчинга находит наиболее подходящих разработчиков под ваш стек и бюджет.',
    color: 'purple',
    gradient: 'from-violet-500/20 to-purple-500/5',
    iconBg: 'rgba(124,58,237,0.15)',
    iconBorder: 'rgba(124,58,237,0.3)',
    iconColor: '#a78bfa',
  },
  {
    icon: Globe,
    title: 'Мультиязычность',
    description:
      'Платформа поддерживает русский, английский и казахский языки. Работайте без барьеров.',
    color: 'cyan',
    gradient: 'from-cyan-500/20 to-blue-500/5',
    iconBg: 'rgba(6,182,212,0.12)',
    iconBorder: 'rgba(6,182,212,0.3)',
    iconColor: '#22d3ee',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 px-4">
      {/* Top divider glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-border to-transparent" />

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm text-accent-light font-medium uppercase tracking-widest mb-3">
            Возможности
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Всё для продуктивной работы
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            Платформа, созданная разработчиками для разработчиков, с учётом
            каждой мелочи реального рабочего процесса
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                whileHover={{ y: -4 }}
                className="group relative p-6 rounded-xl border border-border hover:border-white/10 bg-surface/50 hover:bg-surface transition-all duration-300"
                style={{
                  boxShadow: '0 1px 20px rgba(0,0,0,0.4)',
                }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                  style={{
                    background: feature.iconBg,
                    border: `1px solid ${feature.iconBorder}`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: feature.iconColor }} />
                </div>

                <h3 className="text-base font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
