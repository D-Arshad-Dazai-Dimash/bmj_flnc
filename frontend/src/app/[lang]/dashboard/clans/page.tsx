'use client'
import { Users, Layers3, Sparkles } from 'lucide-react'

export default function ClansPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(201,143,177,0.18)] bg-[linear-gradient(180deg,rgba(201,143,177,0.12),rgba(122,88,172,0.08))]">
          <Users className="w-5 h-5 text-[#efc7d9]" />
        </div>
        <div>
          <div className="chip mb-2 border-[rgba(201,143,177,0.22)] bg-[rgba(201,143,177,0.08)] text-[#efc7d9]">Teams Layer</div>
          <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">Мои кланы</h1>
          <p className="text-[15px] text-text-secondary">Командные структуры, роли и верифицированные инженерные составы</p>
        </div>
      </div>

      <div className="rounded-[18px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-8 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] border border-[rgba(201,143,177,0.22)] bg-bg-panel">
              <Layers3 className="h-7 w-7 text-[#efc7d9]" />
            </div>
            <p className="text-[24px] font-semibold tracking-h2 text-text-base">Кланы в разработке</p>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-text-secondary">
              Здесь появится управление командными профилями: состав, роли, приглашения,
              публичный профиль клана и участие в крупных заказах от компаний.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Публичный профиль команды для крупных тендеров',
              'Приглашения участников и распределение ролей',
              'Портфолио и совместные skill-badges команды',
            ].map(item => (
              <div key={item} className="flex items-start gap-3 rounded-[12px] border border-border bg-bg-card px-4 py-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-[#efc7d9]" />
                <span className="text-sm leading-6 text-text-secondary">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
