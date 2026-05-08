'use client'

import { motion } from 'framer-motion'
import { ShieldCheck, Lock, Eye, BadgeCheck, Server, ArrowRight, Shield } from 'lucide-react'
import Link from '@/components/ui/LocaleLink'
import { Button } from '@/components/ui/button'

const cards = [
  {
    icon: ShieldCheck,
    title: 'Верификация разработчиков',
    desc: 'Каждый разработчик проходит технические тесты по своему стеку. Бейдж верификации — это не звание, а доказанный факт.',
    iconClass: 'text-[#638ad4]',
    bgClass: 'bg-[rgba(99,138,212,0.08)]',
  },
  {
    icon: Lock,
    title: 'Шифрование данных',
    desc: 'Все данные пользователей хранятся в зашифрованном виде (AES-256). Передача данных — только через TLS 1.3.',
    iconClass: 'text-[#4898bc]',
    bgClass: 'bg-[rgba(72,152,188,0.08)]',
  },
  {
    icon: Eye,
    title: 'Прозрачность операций',
    desc: 'Полный лог всех действий по сделке. Заказчик и исполнитель видят историю в реальном времени.',
    iconClass: 'text-[#7a58ac]',
    bgClass: 'bg-[rgba(122,88,172,0.08)]',
  },
  {
    icon: BadgeCheck,
    title: 'KYC для бизнеса',
    desc: 'Юридические лица проходят проверку документов. Это исключает мошенничество с обеих сторон.',
    iconClass: 'text-[#c98fb1]',
    bgClass: 'bg-[rgba(201,143,177,0.08)]',
  },
  {
    icon: Server,
    title: 'Инфраструктура в РК',
    desc: 'Данные хранятся на серверах в Казахстане в соответствии с требованиями локального законодательства.',
    iconClass: 'text-[#4947ab]',
    bgClass: 'bg-[rgba(73,71,171,0.08)]',
  },
  {
    icon: ShieldCheck,
    title: 'Арбитраж и защита',
    desc: 'Независимая служба разрешения споров. Решение принимается на основе данных платформы.',
    iconClass: 'text-[#376fb1]',
    bgClass: 'bg-[rgba(55,111,177,0.08)]',
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
          className="text-center space-y-5"
        >
          <motion.div variants={item} className="flex justify-center">
            <span className="chip chip-accent">
              <Shield className="w-3 h-3 mr-1.5" />
              Безопасность
            </span>
          </motion.div>
          <motion.h1 variants={item} className="text-4xl md:text-5xl font-bold tracking-h1">
            <span className="text-text-base">Ваши данные под </span>
            <span className="text-gradient">надёжной защитой</span>
          </motion.h1>
          <motion.p variants={item} className="text-text-muted max-w-xl mx-auto text-lg leading-relaxed">
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-[10px] border border-border bg-bg-card p-8 grid sm:grid-cols-4 gap-6 text-center"
        >
          {[
            { val: 'AES-256', label: 'Шифрование' },
            { val: '99.9%', label: 'Uptime SLA' },
            { val: '72ч', label: 'Разрешение споров' },
            { val: 'KZ', label: 'Хостинг данных' },
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
