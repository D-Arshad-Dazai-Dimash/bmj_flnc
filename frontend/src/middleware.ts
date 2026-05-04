import { NextResponse, type NextRequest } from 'next/server'

// ── Локали ──────────────────────────────────────────────────
const LOCALES = ['ru', 'en', 'kz']
const DEFAULT_LOCALE = 'ru'

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

  // Нельзя валидно проверять auth cookie в middleware, потому что
  // она установлена backend-доменом (barnamaj-api.fly.dev), а middleware
  // исполняется на frontend-домене (vercel.app). Фактическая проверка
  // сессии выполняется на клиенте через /api/auth/me в AuthContext.
  void pathWithoutLang

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
