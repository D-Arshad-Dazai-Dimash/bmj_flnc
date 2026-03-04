import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

const fontSans = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
})

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Barnamaj — Профессиональный кодинг. Без лишних слов.',
  description:
    'Элитная платформа для разработчиков и бизнеса. Верифицированные команды, клановая система, эскроу-защита сделок.',
  keywords: ['барнамаж', 'barnamaj', 'разработка', 'фриланс', 'кланы', 'программирование'],
  openGraph: {
    title: 'Barnamaj',
    description: 'Профессиональный кодинг. Без лишних слов.',
    type: 'website',
    locale: 'ru_RU',
  },
}

export const viewport: Viewport = {
  themeColor: '#050508',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${fontSans.variable} ${fontMono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
