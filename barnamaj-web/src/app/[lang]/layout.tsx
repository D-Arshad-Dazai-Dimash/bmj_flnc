import { LangProvider } from '@/context/LangContext'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from 'sonner'
import { locales, toHtmlLang } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import type { Locale } from '@/lib/i18n'
import { ToasterThemeWrapper } from '@/components/ToasterThemeWrapper'

export function generateStaticParams() {
  return locales.map(lang => ({ lang }))
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!locales.includes(lang as Locale)) {
    notFound()
  }

  return (
    <LangProvider lang={lang}>
      <AuthProvider>
        {children}
        <ToasterThemeWrapper />
      </AuthProvider>
    </LangProvider>
  )
}
