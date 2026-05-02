'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, FolderKanban, Construction } from 'lucide-react'
import Link from '@/components/ui/LocaleLink'
import { useParams } from 'next/navigation'

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6"
    >
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-base transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Все проекты
      </Link>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-violet-500/15">
          <FolderKanban className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Проект #{params?.id?.slice(0, 8) ?? '—'}</h1>
          <p className="text-sm text-text-muted">Подробная карточка проекта</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-12 flex flex-col items-center gap-4 text-center">
        <Construction className="w-12 h-12 text-amber-400" />
        <div>
          <h2 className="text-lg font-semibold text-text-base">Детальный просмотр в разработке</h2>
          <p className="text-sm text-text-muted mt-1 max-w-md">
            Подробный просмотр заявок, эскроу-операций и сдачи работ будет
            добавлен после релиза соответствующих endpoint'ов в .NET API.
          </p>
        </div>
        <Link
          href="/dashboard/projects"
          className="px-4 py-2 text-sm font-medium rounded-lg border border-accent/40 text-accent-light bg-accent/10 hover:bg-accent/20 transition-colors"
        >
          Вернуться к списку
        </Link>
      </div>
    </motion.div>
  )
}

