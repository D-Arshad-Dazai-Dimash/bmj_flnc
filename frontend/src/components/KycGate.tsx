'use client'

import Link from 'next/link'
import { ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Модалка-блокер для действий, требующих определённого уровня KYC.
 *
 * Показывается, когда сервер вернул 403 с телом
 *   { code: "kyc_required", required: "Lite" | "Full" }.
 *
 * Использование: см. /dashboard/contracts (Фаза 4).
 */
export function KycGate({
  required,
  current,
  onClose,
}: {
  required: 'Lite' | 'Full'
  current?: string
  onClose: () => void
}) {
  const isFull = required === 'Full'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-bg-card p-6 space-y-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-text-muted hover:text-text-base"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-text-base">
            Требуется подтверждение личности
          </h3>
        </div>

        <p className="text-sm text-text-muted">
          {isFull
            ? 'Для денежных операций необходимо пройти полную проверку (KYC Full): документ + селфи. Это требование закона РК «О ПОД/ФТ».'
            : 'Для этого действия нужно подтвердить телефон и указать ИИН (KYC Lite).'}
          {current && (
            <> Текущий статус: <span className="text-text-base">{current}</span>.</>
          )}
        </p>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Link href={isFull ? '/dashboard/profile?kyc=full' : '/dashboard/profile'}>
            <Button variant="default" size="sm">
              {isFull ? 'Пройти KYC Full' : 'Пройти KYC Lite'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
