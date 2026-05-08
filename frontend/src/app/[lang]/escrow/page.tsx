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
    iconClass: 'text-[#638ad4]',
    bgClass: 'bg-[rgba(99,138,212,0.08)]',
  },
  {
    icon: ShieldCheck,
    title: 'Верификация каждой стороны',
    desc: 'Обе стороны сделки проходят проверку личности и репутации. Никаких анонимов — только подтверждённые участники.',
    iconClass: 'text-[#4898bc]',
    bgClass: 'bg-[rgba(72,152,188,0.08)]',
  },
  {
    icon: Banknote,
    title: 'Прозрачные комиссии',
    desc: 'Фиксированная комиссия платформы без скрытых платежей. Вы всегда знаете, сколько получите на руки.',
    iconClass: 'text-[#7a58ac]',
    bgClass: 'bg-[rgba(122,88,172,0.08)]',
  },
  {
    icon: Clock,
    title: 'Автоматическое разрешение споров',
    desc: 'Если стороны не пришли к согласию, подключается арбитраж платформы. Решение в течение 72 часов.',
    iconClass: 'text-[#c98fb1]',
    bgClass: 'bg-[rgba(201,143,177,0.08)]',
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
          className="text-center space-y-5"
        >
          <motion.div variants={item} className="flex justify-center">
            <span className="chip chip-accent">
              <Lock className="w-3 h-3 mr-1.5" />
              Безопасная сделка
            </span>
          </motion.div>
          <motion.h1 variants={item} className="text-4xl md:text-5xl font-bold tracking-h1">
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
                className="rounded-[10px] border border-border bg-bg-card p-6 flex flex-col gap-4 hover:bg-bg-elevated hover:border-border-focus transition-all"
              >
                <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center ${c.bgClass}`}>
                  <Icon className={`w-4.5 h-4.5 ${c.iconClass}`} size={18} />
                </div>
                <div>
                  <h3 className="font-[510] text-text-base mb-1">{c.title}</h3>
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
          className="rounded-[10px] border border-border bg-bg-card p-8"
        >
          <p className="text-[11px] font-[510] tracking-[0.06em] uppercase text-text-faint mb-6 text-center">Как работает эскроу</p>
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
          className="rounded-[10px] border border-border bg-bg-card p-8 grid sm:grid-cols-3 gap-6 text-center"
        >
          {[
            { val: '3%', label: 'Комиссия платформы' },
            { val: '100%', label: 'Возврат при провале сдачи' },
            { val: '72ч', label: 'Максимум на арбитраж' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold tracking-tight text-gradient">{s.val}</p>
              <p className="text-[11px] font-[510] tracking-[0.04em] uppercase text-text-faint mt-1.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

      </div>
    </div>
  )
}
