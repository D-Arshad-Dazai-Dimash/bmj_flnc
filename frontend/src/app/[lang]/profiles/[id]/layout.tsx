'use client'

import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/dashboard/Sidebar'

/**
 * Обёртка для публичного профиля.
 *
 * • Авторизованным пользователям показываем боковое меню как в дашборде —
 *   страница перестаёт быть «голой» и проще навигировать обратно в чат/заказы.
 * • Гостям рендерим только контент (без сайдбара), чтобы лендинг-эффект
 *   делиться внешней ссылкой остался прежним.
 */
export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading || !user) {
    // гость или ещё не определились — без сайдбара
    return <main className="min-h-screen bg-bg-base">{children}</main>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1600px] px-5 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
