'use client'

import { Toaster } from 'sonner'
import { useTheme } from 'next-themes'

export function ToasterThemeWrapper() {
  const { resolvedTheme } = useTheme()
  return (
    <Toaster
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position="bottom-right"
      toastOptions={{
        className: 'border border-border bg-bg-surface text-text-base',
        duration: 5000,
      }}
      offset={16}
      gap={8}
    />
  )
}
