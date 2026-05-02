'use client'

import { motion } from 'framer-motion'
import { Users, Star, Cpu, ShieldCheck, TrendingUp, ArrowRight } from 'lucide-react'
import Link from '@/components/ui/LocaleLink'
import { Button } from '@/components/ui/button'

const featureCards = [
  {
    icon: ShieldCheck,
    title: 'Верификация всей команды',
    desc: 'Каждый участник клана обязан пройти тесты. Клан имеет общий рейтинг, который строится на репутации каждого.',
    color: '#22d3ee',
    bg: 'rgba(0,212,255,0.08)',
  },
  {
    icon: Cpu,
    title: 'Специализации',
    desc: 'Кланы формируются по стеку: Backend, Mobile, ML, DevOps. Заказчик сразу видит, что умеет ваша команда.',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
  },
  {
    icon: Star,
    title: 'XP и рейтинг клана',
    desc: 'Каждый выполненный проект приносит XP клану. Высокий рейтинг — приоритет в выдаче заказов и доступ к VIP-ТЗ.',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.08)',
  },
  {
    icon: TrendingUp,
    title: 'Турниры и челленджи',
    desc: 'Регулярные соревнования между кланами с призовым фондом. Лучшие получают эксклюзивные бейджи и приоритетные контракты.',
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.08)',
  },
]

const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

export default function ClansLandingPage() {
  return (
    <div className="min-h-screen bg-bg-base px-4 py-24">
      <div className="max-w-5xl mx-auto space-y-16">

        {/* Hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="text-center space-y-4"
        >
          <motion.p variants={item} className="label-terminal">Кланы</motion.p>
          <motion.h1 variants={item} className="text-4xl md:text-5xl font-bold">
            <span className="text-text-base">Кодите в </span>
            <span className="text-gradient">лиге лучших</span>
          </motion.h1>
          <motion.p variants={item} className="text-text-muted max-w-xl mx-auto text-lg">
            Клан — это верифицированная команда специалистов. Объединяйтесь, берите сложные заказы и растите в рейтинге вместе.
          </motion.p>
          <motion.div variants={item} className="flex items-center justify-center gap-4 pt-2">
            <Link href="/auth?mode=register&type=Developer">
              <Button variant="default" size="lg">
                Вступить в клан <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/auth?mode=register&type=Client">
              <Button variant="outline" size="lg">Найти команду</Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.09 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
        >
          {/* Wide hero card */}
          <motion.div
            variants={item}
            className="sm:col-span-2 rounded-2xl border bg-bg-card p-8 flex flex-col gap-4 hover:border-accent/30 transition-colors"
            style={{ borderColor: 'rgba(124,58,237,0.25)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent/10">
              <Users className="w-6 h-6 text-accent-light" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-base mb-2">Командная сила</h3>
              <p className="text-text-muted leading-relaxed max-w-2xl">
                Кланы берут заказы, недоступные одиночкам. Крупные проекты с бюджетом от 500 000 ₸ — только для верифицированных команд. Работа в клане — это стабильный поток заказов и общая репутация, которая открывает новые двери.
              </p>
            </div>
            <div className="flex gap-8 pt-2">
              {[
                { val: '120+', label: 'Активных кланов' },
                { val: '500+', label: 'Участников' },
                { val: '2 400+', label: 'Проектов выполнено' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xl font-bold text-gradient">{s.val}</p>
                  <p className="text-xs text-text-faint mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Feature cards */}
          {featureCards.map((c) => {
            const Icon = c.icon
            return (
              <motion.div
                key={c.title}
                variants={item}
                className="rounded-2xl border border-border bg-bg-card p-6 flex flex-col gap-4 hover:border-accent/30 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: c.bg }}
                >
                  <Icon className="w-5 h-5" style={{ color: c.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-text-base mb-1">{c.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{c.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* CTA banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-accent/20 bg-accent/5 p-10 text-center space-y-4"
        >
          <h2 className="text-2xl font-bold text-text-base">Готовы стать частью элиты?</h2>
          <p className="text-text-muted max-w-md mx-auto">
            Зарегистрируйтесь, пройдите верификацию и вступайте в клан по своей специализации.
          </p>
          <Link href="/auth?mode=register&type=Developer">
            <Button variant="default" size="lg" className="mt-2">
              Начать бесплатно <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </motion.div>

      </div>
    </div>
  )
}
