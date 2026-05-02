'use client'

import { motion } from 'framer-motion'
import { ShieldCheck, Lock, Eye, BadgeCheck, Server, ArrowRight } from 'lucide-react'
import Link from '@/components/ui/LocaleLink'
import { Button } from '@/components/ui/button'

const cards = [
  {
    icon: ShieldCheck,
    title: 'Верификация разработчиков',
    desc: 'Каждый разработчик проходит технические тесты по своему стеку. Бейдж верификации — это не звание, а доказанный факт.',
    color: '#a78bfa',
    bg: 'rgba(124,58,237,0.08)',
  },
  {
    icon: Lock,
    title: 'Шифрование данных',
    desc: 'Все данные пользователей хранятся в зашифрованном виде (AES-256). Передача данных — только через TLS 1.3.',
    color: '#22d3ee',
    bg: 'rgba(0,212,255,0.08)',
  },
  {
    icon: Eye,
    title: 'Прозрачность операций',
    desc: 'Полный лог всех действий по сделке. Заказчик и исполнитель видят историю в реальном времени.',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
  },
  {
    icon: BadgeCheck,
    title: 'KYC для бизнеса',
    desc: 'Юридические лица проходят проверку документов. Это исключает мошенничество с обеих сторон.',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.08)',
  },
  {
    icon: Server,
    title: 'Инфраструктура в РК',
    desc: 'Данные хранятся на серверах в Казахстане в соответствии с требованиями локального законодательства.',
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.08)',
  },
  {
    icon: ShieldCheck,
    title: 'Арбитраж и защита',
    desc: 'Независимая служба разрешения споров. Решение принимается на основе данных платформы, а не слов сторон.',
    color: '#a78bfa',
    bg: 'rgba(124,58,237,0.08)',
  },
]

const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

export default function SafetyPage() {
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
          <motion.p variants={item} className="label-terminal">Безопасность</motion.p>
          <motion.h1 variants={item} className="text-4xl md:text-5xl font-bold">
            <span className="text-text-base">Ваши данные под </span>
            <span className="text-gradient">надёжной защитой</span>
          </motion.h1>
          <motion.p variants={item} className="text-text-muted max-w-xl mx-auto text-lg">
            Barnamaj — платформа, где безопасность встроена в каждый слой: от верификации участников до хранения данных.
          </motion.p>
          <motion.div variants={item} className="flex items-center justify-center gap-4 pt-2">
            <Link href="/auth?mode=register">
              <Button variant="default" size="lg">
                Присоединиться <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/escrow">
              <Button variant="outline" size="lg">Узнать об эскроу</Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
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

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-border bg-bg-card p-8 grid sm:grid-cols-4 gap-6 text-center"
        >
          {[
            { val: 'AES-256', label: 'Шифрование' },
            { val: '99.9%', label: 'Uptime SLA' },
            { val: '72ч', label: 'Разрешение споров' },
            { val: 'KZ', label: 'Хостинг данных' },
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
