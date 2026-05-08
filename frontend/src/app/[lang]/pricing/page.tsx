'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Zap, Building2, Users, Sparkles } from 'lucide-react'
import Link from '@/components/ui/LocaleLink'
import { Button } from '@/components/ui/button'

const plans = [
  {
    id: 'free',
    icon: Zap,
    name: 'Старт',
    price: 'Бесплатно',
    sub: 'Всегда',
    accentClass: 'text-[#a46c84]',
    borderClass: 'border-[rgba(164,108,132,0.25)]',
    bgClass: 'bg-[rgba(164,108,132,0.06)]',
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
    accentClass: 'text-[#4898bc]',
    borderClass: 'border-[rgba(72,152,188,0.4)]',
    bgClass: 'bg-[rgba(72,152,188,0.08)]',
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
    accentClass: 'text-[#7a58ac]',
    borderClass: 'border-[rgba(122,88,172,0.25)]',
    bgClass: 'bg-[rgba(122,88,172,0.06)]',
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
          className="text-center space-y-5"
        >
          <motion.div variants={item} className="flex justify-center">
            <span className="chip chip-accent">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Тарифы
            </span>
          </motion.div>
          <motion.h1 variants={item} className="text-4xl md:text-5xl font-bold tracking-h1">
            <span className="text-text-base">Прозрачное </span>
            <span className="text-gradient">ценообразование</span>
          </motion.h1>
          <motion.p variants={item} className="text-text-muted max-w-xl mx-auto text-lg leading-relaxed">
            Начните бесплатно — масштабируйтесь когда будете готовы. Никаких скрытых платежей.
          </motion.p>
        </motion.div>

        {/* Plans */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {plans.map((p) => {
            const Icon = p.icon
            return (
              <motion.div
                key={p.id}
                variants={item}
                className={`rounded-[12px] border ${p.borderClass} ${p.highlight ? p.bgClass : 'bg-bg-card'} p-6 flex flex-col gap-5 relative transition-shadow hover:shadow-card-hover`}
              >
                {p.highlight && (
                  <div className="absolute -top-px left-0 right-0 h-px rounded-t-[12px] bg-gradient-to-r from-transparent via-[rgba(72,152,188,0.6)] to-transparent" />
                )}
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="chip chip-accent text-[10px] py-0.5 px-2.5">Популярный</span>
                  </div>
                )}
                <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center ${p.bgClass}`}>
                  <Icon className={`w-4.5 h-4.5 ${p.accentClass}`} size={18} />
                </div>
                <div>
                  <p className={`text-[11px] font-[510] tracking-[0.06em] uppercase mb-1.5 ${p.accentClass}`}>{p.name}</p>
                  <p className="text-3xl font-bold tracking-tight text-text-base">{p.price}</p>
                  <p className="text-xs text-text-faint mt-0.5">{p.sub}</p>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${p.accentClass}`} />
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

        {/* Escrow facts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-[10px] border border-border bg-bg-card p-8"
        >
          <p className="text-[11px] font-[510] tracking-[0.06em] uppercase text-text-faint mb-6 text-center">Комиссии и условия</p>
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              { q: 'Комиссия эскроу', a: '3% от суммы сделки' },
              { q: 'Вывод средств', a: 'Мгновенно на карту' },
              { q: 'Возврат', a: '100% при провале' },
            ].map((f) => (
              <div key={f.q}>
                <p className="text-[11px] font-[510] tracking-[0.06em] uppercase text-text-faint mb-1.5">{f.q}</p>
                <p className="font-semibold text-text-base text-lg">{f.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}
