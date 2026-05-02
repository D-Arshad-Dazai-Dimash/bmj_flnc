'use client'
import { Users } from 'lucide-react'

export default function ClansPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-bg-card p-8 flex flex-col items-center justify-center gap-3 text-center">
        <Users className="w-10 h-10 text-text-faint mx-auto" />
        <p className="text-text-base font-medium">Кланы в разработке</p>
        <p className="text-sm text-text-muted">Управление кланами будет доступно в следующей итерации.</p>
      </div>
    </div>
  )
}
