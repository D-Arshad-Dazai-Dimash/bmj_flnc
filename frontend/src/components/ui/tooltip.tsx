'use client'

import * as React from 'react'

/**
 * Лёгкий tooltip без зависимостей. Появляется при hover/focus,
 * не блокирует клики (pointer-events-none на обёртке всплывашки).
 */
export function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: string
  children: React.ReactNode
  side?: 'top' | 'bottom'
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-bg-elevated px-2 py-1 text-[11px] font-medium text-text-base opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
          side === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'
        }`}
      >
        {label}
      </span>
    </span>
  )
}
