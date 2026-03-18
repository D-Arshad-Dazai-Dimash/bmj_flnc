import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

// ── Локали ──────────────────────────────────────────────────
const LOCALES = ['ru', 'en', 'kz']
const DEFAULT_LOCALE = 'ru'

// ── Маршруты по ролям ───────────────────────────────────────
const FREELANCER_ROUTES = ['/dashboard/freelancer', '/dashboard/orders', '/dashboard/find-teams']
const CLIENT_ROUTES     = ['/dashboard/client', '/dashboard/create-project']
const SHARED_ROUTES     = ['/dashboard/projects', '/dashboard/contracts', '/dashboard/clans']
const PROTECTED_PREFIX  = '/dashboard'
const AUTH_ROUTE        = '/auth'

function detectLocale(request: NextRequest): string {
  const cookie = request.cookies.get('NEXT_LOCALE')?.value
  if (cookie && LOCALES.includes(cookie)) return cookie

  const acceptLang = request.headers.get('accept-language') ?? ''
  if (acceptLang.includes('kk') || acceptLang.includes('kz')) return 'kz'
  if (acceptLang.includes('en')) return 'en'
  return DEFAULT_LOCALE
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 0. Извлечение / редирект по локали ────────────────────
  const segments = pathname.split('/')
  const maybeLocale = segments[1]

  if (!LOCALES.includes(maybeLocale)) {
    const locale = detectLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname}`
    const res = NextResponse.redirect(url)
    res.cookies.set('NEXT_LOCALE', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
    return res
  }

  const lang = maybeLocale
  // Путь без языкового префикса — для существующих проверок
  const pathWithoutLang = '/' + segments.slice(2).join('/')

  let response = NextResponse.next({ request })
  response.cookies.set('NEXT_LOCALE', lang, { path: '/', maxAge: 60 * 60 * 24 * 365 })

  // ── Публичные маршруты — не трогаем Supabase ──────────────
  const needsAuth = pathWithoutLang.startsWith(PROTECTED_PREFIX) || pathWithoutLang.startsWith(AUTH_ROUTE)
  if (!needsAuth) {
    return response
  }

  // ── Supabase-клиент для middleware (только для auth/dashboard) ─
  let user = null
  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({ request })
            response.cookies.set('NEXT_LOCALE', lang, { path: '/', maxAge: 60 * 60 * 24 * 365 })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // ── Получаем текущего пользователя ────────────────────────
    const { data } = await supabase.auth.getUser()
    user = data.user

    // ── 1. Dashboard без сессии → /auth ───────────────────────
    if (pathWithoutLang.startsWith(PROTECTED_PREFIX) && !user) {
      const url = request.nextUrl.clone()
      url.pathname = `/${lang}${AUTH_ROUTE}`
      url.searchParams.set('mode', 'login')
      url.searchParams.set('redirectTo', pathWithoutLang)
      return NextResponse.redirect(url)
    }

    // ── 2. Авторизованный на /auth → /dashboard ──────────────
    if (pathWithoutLang.startsWith(AUTH_ROUTE) && user) {
      const url = request.nextUrl.clone()
      url.pathname = `/${lang}/dashboard`
      return NextResponse.redirect(url)
    }

    // ── 3. Ролевая защита ────────────────────────────────────
    if (user && pathWithoutLang.startsWith(PROTECTED_PREFIX)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile) {
        const role = profile.role
        const isSharedRoute = SHARED_ROUTES.some(r => pathWithoutLang.startsWith(r))

        if (!isSharedRoute) {
          const isFreelancerInClientZone =
            role === 'freelancer' &&
            CLIENT_ROUTES.some(r => pathWithoutLang.startsWith(r))

          const isClientInFreelancerZone =
            role === 'client' &&
            FREELANCER_ROUTES.some(r => pathWithoutLang.startsWith(r))

          if (isFreelancerInClientZone || isClientInFreelancerZone) {
            const url = request.nextUrl.clone()
            url.pathname = `/${lang}/dashboard`
            url.searchParams.set('notice', 'role_mismatch')
            return NextResponse.redirect(url)
          }
        }
      }
    }
  } catch (err) {
    // Supabase unavailable — allow request through, client-side auth will handle it
    console.warn('[middleware] Supabase auth check failed:', (err as Error)?.message)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
