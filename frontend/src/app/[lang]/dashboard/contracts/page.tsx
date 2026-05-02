'use client'
import { Shield } from 'lucide-react'

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-bg-card p-8 flex flex-col items-center justify-center gap-3 text-center">
        <Shield className="w-10 h-10 text-text-faint mx-auto" />
        <p className="text-text-base font-medium">Контракты в разработке</p>
        <p className="text-sm text-text-muted">Эскроу-контракты будут доступны после реализации платёжного модуля.</p>
      </div>
    </div>
  )
}
