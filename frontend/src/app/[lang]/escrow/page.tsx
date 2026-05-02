'use client'

import { motion } from 'framer-motion'
import { Lock, ShieldCheck, Banknote, Clock, ArrowRight } from 'lucide-react'
import Link from '@/components/ui/LocaleLink'
import { Button } from '@/components/ui/button'

const cards = [
  {
    icon: Lock,
    title: 'Средства заморожены до приёмки',
    desc: 'Заказчик вносит оплату на эскроу-счёт до старта работ. Исполнитель получает деньги только после подтверждения результата.',
    color: '#a78bfa',
    bg: 'rgba(124,58,237,0.08)',
  },
  {
    icon: ShieldCheck,
    title: 'Верификация каждой стороны',
    desc: 'Обе стороны сделки проходят проверку личности и репутации. Никаких анонимов — только подтверждённые участники.',
    color: '#22d3ee',
    bg: 'rgba(0,212,255,0.08)',
  },
  {
    icon: Banknote,
    title: 'Прозрачные комиссии',
    desc: 'Фиксированная комиссия платформы без скрытых платежей. Вы всегда знаете, сколько получите на руки.',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
  },
  {
    icon: Clock,
    title: 'Автоматическое разрешение споров',
    desc: 'Если стороны не пришли к согласию, подключается арбитраж платформы. Решение в течение 72 часов.',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.08)',
  },
]

const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

export default function EscrowPage() {
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
          <motion.p variants={item} className="label-terminal">Безопасная сделка</motion.p>
          <motion.h1 variants={item} className="text-4xl md:text-5xl font-bold">
            <span className="text-text-base">Деньги под </span>
            <span className="text-gradient">защитой эскроу</span>
          </motion.h1>
          <motion.p variants={item} className="text-text-muted max-w-xl mx-auto text-lg">
            Платите только после того, как убедились в результате. Система эскроу Barnamaj защищает обе стороны каждой сделки.
          </motion.p>
          <motion.div variants={item} className="flex items-center justify-center gap-4 pt-2">
            <Link href="/auth?mode=register">
              <Button variant="default" size="lg">
                Начать <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/safety">
              <Button variant="outline" size="lg">Как мы защищаем данные</Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
        >
          {cards.map((c) => {
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

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-border bg-bg-card p-8"
        >
          <h2 className="text-xl font-bold text-text-base mb-6 text-center">Как работает эскроу</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { step: '01', text: 'Заказчик публикует ТЗ и пополняет эскроу' },
              { step: '02', text: 'Команда принимает заказ и начинает работу' },
              { step: '03', text: 'Заказчик принимает результат и подтверждает' },
              { step: '04', text: 'Средства автоматически переводятся команде' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
                  <span className="text-xs font-mono font-bold text-accent-light">{s.step}</span>
                </div>
                <p className="text-sm text-text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-border bg-bg-card p-8 grid sm:grid-cols-3 gap-6 text-center"
        >
          {[
            { val: '3%', label: 'Комиссия платформы' },
            { val: '100%', label: 'Возврат при провале сдачи' },
            { val: '72ч', label: 'Максимум на арбитраж' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-gradient">{s.val}</p>
              <p className="text-xs text-text-faint mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>

      </div>
    </div>
  )
}
