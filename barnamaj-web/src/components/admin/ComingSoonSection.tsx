'use client'
import { Construction } from 'lucide-react'

interface Props {
  title: string
  description?: string
}

export default function ComingSoonSection({ title, description }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500/15">
          <Construction className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">{title}</h1>
          {description && <p className="text-sm text-text-muted">{description}</p>}
        </div>
      </div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center space-y-3">
        <Construction className="w-10 h-10 text-amber-400 mx-auto" />
        <p className="text-text-base font-medium">Раздел в разработке</p>
        <p className="text-sm text-text-muted max-w-sm mx-auto">
          Административный API для этого раздела будет реализован в следующей итерации разработки.
        </p>
      </div>
    </div>
  )
}
