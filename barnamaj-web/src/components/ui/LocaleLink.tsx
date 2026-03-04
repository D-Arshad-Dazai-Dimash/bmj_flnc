'use client'

import NextLink from 'next/link'
import { useParams } from 'next/navigation'
import type { ComponentProps } from 'react'

type LinkProps = ComponentProps<typeof NextLink>

/**
 * Drop-in replacement for next/link that automatically
 * prepends the current `[lang]` segment to absolute paths.
 */
export default function LocaleLink({ href, ...props }: LinkProps) {
  const params = useParams<{ lang?: string }>()
  const lang = params?.lang || 'ru'

  let localizedHref: LinkProps['href'] = href

  if (typeof href === 'string') {
    // Only prepend for absolute paths that don't already have a locale
    if (href.startsWith('/') && !href.match(/^\/(ru|en|kz)(\/|$)/)) {
      localizedHref = `/${lang}${href}`
    }
  } else if (typeof href === 'object' && href.pathname) {
    if (href.pathname.startsWith('/') && !href.pathname.match(/^\/(ru|en|kz)(\/|$)/)) {
      localizedHref = { ...href, pathname: `/${lang}${href.pathname}` }
    }
  }

  return <NextLink href={localizedHref} {...props} />
}
