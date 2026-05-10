import * as React from 'react'

/**
 * Универсальный skeleton-плейсхолдер. Имитирует размер итогового блока,
 * чтобы не было layout-shift.
 */
export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-bg-hover/60 ${className}`}
      {...props}
    />
  )
}
