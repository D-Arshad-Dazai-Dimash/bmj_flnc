'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Zap, Building2, Users } from 'lucide-react'
import Link from '@/components/ui/LocaleLink'
import { Button } from '@/components/ui/button'

const plans = [
  {
    id: 'free',
    icon: Zap,
    name: 'Старт',
    price: 'Бесплатно',
    sub: 'Всегда',
    color: '#a78bfa',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.2)',
    features: [
      'До 3 откликов в месяц',
      'Базовый профиль разработчика',
      'Доступ к ленте заказов',
      'Участие в одном клане',
    ],
    cta: 'Начать бесплатно',
    href: '/auth?mode=register',
    highlight: false,
  },
  {
    id: 'pro',
    icon: Users,
    name: 'Про',
    price: '4 990 ₸',
    sub: 'в месяц',
    color: '#22d3ee',
    bg: 'rgba(0,212,255,0.08)',
    border: 'rgba(0,212,255,0.35)',
    features: [
      'Безлимитные отклики',
      'Верифицированный бейдж',
      'Приоритет в выдаче кланов',
      'Аналитика профиля',
      'Поддержка 24/7',
    ],
    cta: 'Выбрать Про',
    href: '/auth?mode=register',
    highlight: true,
  },
  {
    id: 'business',
    icon: Building2,
    name: 'Бизнес',
    price: 'По запросу',
    sub: 'индивидуально',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.2)',
    features: [
      'Команда клиентских менеджеров',
      'SLA и гарантированный дедлайн',
      'Белый лейбл и API-доступ',
      'Корпоративный договор',
      'Выделенный арбитраж',
    ],
    cta: 'Связаться с нами',
    href: 'mailto:sales@barnamaj.kz',
    highlight: false,
  },
]

const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

export default function PricingPage() {
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
          <motion.p variants={item} className="label-terminal">Тарифы</motion.p>
          <motion.h1 variants={item} className="text-4xl md:text-5xl font-bold">
            <span className="text-text-base">Простые и </span>
            <span className="text-gradient">прозрачные цены</span>
          </motion.h1>
          <motion.p variants={item} className="text-text-muted max-w-xl mx-auto text-lg">
            Начните бесплатно — масштабируйтесь когда будете готовы. Никаких скрытых платежей.
          </motion.p>
        </motion.div>

        {/* Plans */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {plans.map((p) => {
            const Icon = p.icon
            return (
              <motion.div
                key={p.id}
                variants={item}
                className="rounded-2xl border bg-bg-card p-6 flex flex-col gap-5 relative"
                style={{ borderColor: p.border }}
              >
                {p.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}
                  >
                    Популярный
                  </div>
                )}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: p.bg }}
                >
                  <Icon className="w-5 h-5" style={{ color: p.color }} />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: p.color }}>
                    {p.name}
                  </p>
                  <p className="text-3xl font-bold text-text-base">{p.price}</p>
                  <p className="text-xs text-text-faint mt-0.5">{p.sub}</p>
                </div>
                <ul className="flex flex-col gap-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: p.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.href}>
                  <Button
                    variant={p.highlight ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                  >
                    {p.cta} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>

        {/* FAQ brief */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-border bg-bg-card p-8 grid sm:grid-cols-3 gap-6 text-center"
        >
          {[
            { q: 'Комиссия эскроу', a: '3% от суммы сделки' },
            { q: 'Вывод средств', a: 'Мгновенно на карту или счёт' },
            { q: 'Возврат', a: '100% при провале сдачи работ' },
          ].map((f) => (
            <div key={f.q}>
              <p className="text-xs text-text-faint uppercase tracking-widest mb-1">{f.q}</p>
              <p className="font-semibold text-text-base">{f.a}</p>
            </div>
          ))}
        </motion.div>

      </div>
    </div>
  )
}
