import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-geist-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Barnamaj — Экосистема элитного программирования',
  description:
    'Barnamaj — платформа нового поколения для связи элитных разработчиков и заказчиков. Кланы, верификация навыков, смарт-контракты.',
  keywords: ['разработка', 'фриланс', 'программирование', 'клан', 'barnamaj'],
  openGraph: {
    title: 'Barnamaj',
    description: 'Экосистема элитного программирования',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`${inter.variable} dark`}>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
