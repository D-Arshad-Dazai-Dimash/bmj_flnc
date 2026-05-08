'use client'
import { Construction, Sparkles, ArrowUpRight } from 'lucide-react'

interface Props {
  title: string
  description?: string
}

export default function ComingSoonSection({ title, description }: Props) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(201,143,177,0.18)] bg-[linear-gradient(180deg,rgba(201,143,177,0.12),rgba(122,88,172,0.08))]">
          <Construction className="w-5 h-5 text-[#efc7d9]" />
        </div>
        <div>
          <div className="chip mb-2 border-[rgba(201,143,177,0.22)] bg-[rgba(201,143,177,0.08)] text-[#efc7d9]">Admin Module</div>
          <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">{title}</h1>
          {description && <p className="text-[15px] text-text-secondary">{description}</p>}
        </div>
      </div>
      <div className="rounded-[18px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-8 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] border border-[rgba(201,143,177,0.22)] bg-bg-panel">
              <Sparkles className="h-7 w-7 text-[#efc7d9]" />
            </div>
            <p className="text-[24px] font-semibold tracking-h2 text-text-base">Раздел в разработке</p>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-text-secondary">
              Административный API для этого направления будет реализован в следующей итерации.
              Визуальный контур уже подготовлен под реальные операционные сценарии.
            </p>
          </div>
          <div className="rounded-[14px] border border-border bg-bg-card p-4">
            <p className="text-[13px] font-[510] tracking-caption text-text-base">Что здесь появится</p>
            <div className="mt-3 space-y-3">
              {[
                'Детальные действия и массовые операции',
                'Фильтрация, статусы и рабочие очереди',
                'История изменений и аудит исполнения',
              ].map(item => (
                <div key={item} className="flex items-start gap-3 rounded-[10px] border border-border bg-bg-panel px-3 py-2.5 text-sm text-text-secondary">
                  <ArrowUpRight className="mt-0.5 h-4 w-4 text-[#bfd1ff]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
