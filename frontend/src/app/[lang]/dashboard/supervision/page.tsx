'use client'

import { motion } from 'framer-motion'
import { Eye, Construction } from 'lucide-react'
import Link from '@/components/ui/LocaleLink'

export default function SupervisionDashboardPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-orange-500/15">
          <Eye className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Технический надзор</h1>
          <p className="text-sm text-text-muted">Контроль качества выполнения проектов</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-12 flex flex-col items-center gap-4 text-center">
        <Construction className="w-12 h-12 text-amber-400" />
        <div>
          <h2 className="text-lg font-semibold text-text-base">В разработке</h2>
          <p className="text-sm text-text-muted mt-1 max-w-md">
            Модуль технического надзора будет доступен после релиза подсистемы
            эскроу и контрактов в backend.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium rounded-lg border border-accent/40 text-accent-light bg-accent/10 hover:bg-accent/20 transition-colors"
        >
          Вернуться в дашборд
        </Link>
      </div>
    </motion.div>
  )
}

