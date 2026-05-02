import { NextResponse, type NextRequest } from 'next/server'

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

  // ── Skip API routes — они не нуждаются в локали ────────────
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

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
  const pathWithoutLang = '/' + segments.slice(2).join('/')

  const response = NextResponse.next({ request })
  response.cookies.set('NEXT_LOCALE', lang, { path: '/', maxAge: 60 * 60 * 24 * 365 })

  // ── Публичные маршруты ────────────────────────────────────
  const needsAuth = pathWithoutLang.startsWith(PROTECTED_PREFIX) || pathWithoutLang.startsWith(AUTH_ROUTE)
  if (!needsAuth) {
    return response
  }

  // ── Проверяем наличие access_token cookie ─────────────────
  // Токен хранится в httpOnly cookie, установленной ASP.NET Core.
  // Middleware не читает содержимое (httpOnly), но может проверить присутствие:
  const hasAccessToken = request.cookies.has('access_token')

  // ── 1. Dashboard без токена → /auth ──────────────────────
  if (pathWithoutLang.startsWith(PROTECTED_PREFIX) && !hasAccessToken) {
    const url = request.nextUrl.clone()
    url.pathname = `/${lang}${AUTH_ROUTE}`
    url.searchParams.set('mode', 'login')
    url.searchParams.set('redirectTo', pathWithoutLang)
    return NextResponse.redirect(url)
  }

  // ── 2. Авторизованный на /auth → /dashboard ──────────────
  if (pathWithoutLang.startsWith(AUTH_ROUTE) && hasAccessToken) {
    const url = request.nextUrl.clone()
    url.pathname = `/${lang}/dashboard`
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
