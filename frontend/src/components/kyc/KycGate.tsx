'use client'

/**
 * KycGate — глобальная модалка, открывается автоматически при ответе
 * 403 {code:"kyc_required",current,required} от любого защищённого endpoint.
 *
 * Срабатывает на CustomEvent 'barnamaj:kyc-required' (генерируется в lib/api.ts).
 * Подключается один раз в layout (см. /app/[lang]/layout.tsx или /app/layout.tsx).
 */

import { useEffect, useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter, useParams } from 'next/navigation'

interface KycRequiredDetail {
  error?: string
  code?: string
  current?: string
  required?: string
}

const STATUS_LABEL: Record<string, string> = {
  None: 'не пройдена',
  Lite: 'базовая (Lite)',
  DocPending: 'на проверке',
  Full: 'полная',
  Rejected: 'отклонена',
}

export function KycGate() {
  const [detail, setDetail] = useState<KycRequiredDetail | null>(null)
  const router = useRouter()
  const params = useParams<{ lang?: string }>()
  const lang = params?.lang ?? 'ru'

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<KycRequiredDetail>
      setDetail(ce.detail ?? {})
    }
    window.addEventListener('barnamaj:kyc-required', handler)
    return () => window.removeEventListener('barnamaj:kyc-required', handler)
  }, [])

  if (!detail) return null

  const close = () => setDetail(null)
  const goVerify = () => {
    close()
    router.push(`/${lang}/dashboard/settings?section=verification&kyc=open`)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kyc-gate-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-yellow-500/40 bg-bg-card shadow-glow-md"
      >
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="kyc-gate-title" className="text-base font-bold text-text-base">
                Требуется верификация
              </h2>
              <p className="text-xs text-text-muted">Доступ к этой функции ограничен</p>
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Закрыть"
            className="p-1 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-base"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            Для использования этой функции нужен уровень верификации
            {' '}<span className="text-text-base font-semibold">{STATUS_LABEL[detail.required ?? ''] ?? detail.required ?? 'выше текущего'}</span>.
            {detail.current && (
              <> Сейчас ваш уровень: <span className="text-yellow-400">{STATUS_LABEL[detail.current] ?? detail.current}</span>.</>
            )}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="default" size="md" onClick={goVerify}>
              Пройти верификацию
            </Button>
            <Button variant="ghost" size="sm" onClick={close}>
              Позже
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
