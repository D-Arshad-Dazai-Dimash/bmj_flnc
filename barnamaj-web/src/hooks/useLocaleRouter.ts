'use client'

import { useRouter, useParams } from 'next/navigation'
import { useMemo } from 'react'

/**
 * Drop-in replacement for `useRouter()` that prepends the current
 * `[lang]` segment to push / replace calls.
 */
export function useLocaleRouter() {
  const router = useRouter()
  const params = useParams<{ lang?: string }>()
  const lang = params?.lang || 'ru'

  return useMemo(() => {
    const localize = (path: string) => {
      if (path.startsWith('/') && !path.match(/^\/(ru|en|kz)(\/|$)/)) {
        return `/${lang}${path}`
      }
      return path
    }

    return {
      ...router,
      push: (path: string, options?: Parameters<typeof router.push>[1]) =>
        router.push(localize(path), options),
      replace: (path: string, options?: Parameters<typeof router.replace>[1]) =>
        router.replace(localize(path), options),
    }
  }, [router, lang])
}
