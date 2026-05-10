'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

/**
 * Кнопка "Назад". Если в истории есть предыдущая страница — router.back(),
 * иначе — переход на fallback. Используется в шапках публичных страниц.
 */
export function BackButton({
  fallbackHref,
  label = 'Назад',
  className = '',
}: {
  fallbackHref: string
  label?: string
  className?: string
}) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
        } else {
          router.push(fallbackHref)
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card/60 px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-white/20 hover:bg-bg-hover hover:text-text-base ${className}`}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
