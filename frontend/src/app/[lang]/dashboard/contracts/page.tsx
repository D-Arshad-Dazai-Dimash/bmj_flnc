'use client'
import { Shield, ArrowUpRight, LockKeyhole } from 'lucide-react'

export default function ContractsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(72,152,188,0.18)] bg-[linear-gradient(180deg,rgba(72,152,188,0.16),rgba(73,71,171,0.08))]">
          <Shield className="w-5 h-5 text-[#8fd7ed]" />
        </div>
        <div>
          <div className="chip chip-accent mb-2">Escrow Layer</div>
          <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">Контракты</h1>
          <p className="text-[15px] text-text-secondary">Защищённый контур сделки и контроль этапов исполнения</p>
        </div>
      </div>

      <div className="rounded-[18px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-8 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] border border-[rgba(72,152,188,0.22)] bg-bg-panel">
              <LockKeyhole className="h-7 w-7 text-[#a8e0ef]" />
            </div>
            <p className="text-[24px] font-semibold tracking-h2 text-text-base">Контракты в разработке</p>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-text-secondary">
              Эскроу-контракты появятся после подключения платёжного модуля. Здесь будет храниться
              весь жизненный цикл сделки: условия, этапы, суммы, подтверждения и release средств.
            </p>
          </div>

          <div className="rounded-[14px] border border-border bg-bg-card p-4">
            <p className="text-[13px] font-[510] tracking-caption text-text-base">Что появится</p>
            <div className="mt-3 space-y-3 text-sm text-text-secondary">
              {[
                'Этапы работ с подтверждением выполнения',
                'Escrow hold и безопасный release средств',
                'История изменений и статусы исполнения',
              ].map(item => (
                <div key={item} className="flex items-start gap-3 rounded-[10px] border border-border bg-bg-panel px-3 py-2.5">
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
