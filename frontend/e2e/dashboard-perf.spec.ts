/**
 * Dashboard Performance Trace Test
 * ─────────────────────────────────────────────────────────────
 * Замеряет время между кликом по кнопке и:
 *   1) изменением URL (навигация)
 *   2) появлением нового контента
 *
 * Запуск:  npx playwright test e2e/dashboard-perf.spec.ts --trace on
 * Потом:   npx playwright show-trace <trace.zip>
 *          npx playwright show-report
 *
 * В Timeline (trace viewer) видны:
 *   ▸ network fetch к Supabase (сколько мс)
 *   ▸ layout / paint фазы
 *   ▸ JS execution (React render)
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// ── Helpers ──────────────────────────────────────────────────

/**
 * Login by calling Supabase REST API from Node.js,
 * then injecting session cookies into the browser context.
 * This bypasses UI entirely — cookies are set before any page loads.
 */
async function loginViaAPI(context: BrowserContext, email: string, password: string) {
  // 1. Get session from Supabase Auth REST API
  const resp = await context.request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
      },
      data: { email, password },
    }
  )
  const session = await resp.json()
  if (!session.access_token) {
    throw new Error(`Supabase login failed: ${JSON.stringify(session)}`)
  }

  // 2. Build cookies the EXACT way @supabase/ssr stores them
  //    Cookie name: sb-{hostname_first_part}-auth-token
  //    Value: raw JSON string (NOT base64 — default cookieEncoding is raw)
  //    Chunking: encodeURIComponent(value).length > 3180 → split into .0, .1, ...
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0] // "127"
  const cookieBase = `sb-${ref}-auth-token`

  // Raw JSON — exactly as @supabase/ssr stores it
  const raw = JSON.stringify(session)
  const encodedLength = encodeURIComponent(raw).length

  const CHUNK_SIZE = 3180
  if (encodedLength <= CHUNK_SIZE) {
    // Fits in one cookie
    await context.addCookies([{
      name: cookieBase,
      value: raw,
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax' as const,
    }])
  } else {
    // Need to chunk — mirror createChunks logic from @supabase/ssr
    const chunks: string[] = []
    let encoded = encodeURIComponent(raw)
    while (encoded.length > 0) {
      let head = encoded.slice(0, CHUNK_SIZE)
      // Don't split in the middle of a percent-encoded sequence
      const lastPct = head.lastIndexOf('%')
      if (lastPct > CHUNK_SIZE - 3) {
        head = head.slice(0, lastPct)
      }
      chunks.push(decodeURIComponent(head))
      encoded = encoded.slice(head.length)
    }
    await context.addCookies(
      chunks.map((val, i) => ({
        name: `${cookieBase}.${i}`,
        value: val,
        domain: 'localhost',
        path: '/',
        sameSite: 'Lax' as const,
      }))
    )
  }
}

/** Navigate to auth page, fill form, click submit, wait for /dashboard pathname */
async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/auth?mode=login')
  await page.waitForLoadState('networkidle')

  const emailInput = page.locator('input[type="email"]').first()
  const pwdInput   = page.locator('input[type="password"]').first()
  await emailInput.fill(email)
  await pwdInput.fill(password)

  const submitBtn = page.locator('button[type="submit"]').first()
  await submitBtn.click()

  // Use pathname check — not glob — to avoid matching "redirectTo=/dashboard" in query
  await page.waitForURL(
    url => url.pathname.startsWith('/dashboard'),
    { timeout: 15_000 }
  )
}

// ── Tests ────────────────────────────────────────────────────

test.describe('Dashboard navigation timing', () => {

  test('QuickCard "Создать ТЗ" → /dashboard/create-project', async ({ page }) => {
    // Login via API (cookies injected before any navigation)
    await loginViaAPI(page.context(), 'client@test.local', 'Test123456!')
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Client should see "Создать ТЗ" quick card
    const card = page.locator('a[href="/dashboard/create-project"]').first()
    await expect(card).toBeVisible({ timeout: 15_000 })

    // Measure navigation
    await page.evaluate(() => performance.clearResourceTimings())
    const t0 = Date.now()

    await card.click()
    await expect(page.locator('h1').filter({ hasText: 'Создать ТЗ' })).toBeVisible({ timeout: 10_000 })

    const t1 = Date.now()
    const totalMs = t1 - t0

    // Gather Supabase network requests
    const supabaseTimings = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(e => e.name.includes('supabase') || e.name.includes('rest/v1') || e.name.includes('54321'))
        .map(e => ({ url: e.name.split('?')[0], durationMs: Math.round(e.duration) }))
    })

    console.log(`\n⏱  "Создать ТЗ" click → content: ${totalMs}ms`)
    console.log(`📡 Supabase:`, supabaseTimings.length ? supabaseTimings : '(none)')
    console.log()

    expect(totalMs).toBeLessThan(5000)
  })

  test('Sidebar "Мои проекты" → /dashboard/projects (content appears)', async ({ page }) => {
    await loginViaAPI(page.context(), 'client@test.local', 'Test123456!')
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const link = page.locator('a[href="/dashboard/projects"]')
    await expect(link).toBeVisible({ timeout: 15_000 })

    await page.evaluate(() => performance.clearResourceTimings())
    const t0 = Date.now()

    await link.click()
    await expect(page.locator('h1').filter({ hasText: 'Мои проекты' })).toBeVisible({ timeout: 10_000 })

    const t1 = Date.now()
    const totalMs = t1 - t0

    const supabaseTimings = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(e => e.name.includes('supabase') || e.name.includes('rest/v1') || e.name.includes('54321'))
        .map(e => ({ url: e.name.split('?')[0], durationMs: Math.round(e.duration) }))
    })

    console.log(`\n⏱  "Мои проекты" click → content: ${totalMs}ms`)
    console.log(`📡 Supabase:`, supabaseTimings.length ? supabaseTimings : '(none)')
    console.log()

    expect(totalMs).toBeLessThan(5000)
  })

  test('Sidebar "Лента заказов" → /dashboard/orders (Developer view)', async ({ page }) => {
    await loginViaAPI(page.context(), 'dev@test.local', 'Test123456!')
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Use sidebar-specific selector to avoid matching QuickCard link too
    const link = page.locator('nav a[href="/dashboard/orders"], aside a[href="/dashboard/orders"]').first()
    await expect(link).toBeVisible({ timeout: 15_000 })

    await page.evaluate(() => performance.clearResourceTimings())
    const t0 = Date.now()

    await link.click()
    await expect(page.locator('h1').filter({ hasText: 'Лента заказов' })).toBeVisible({ timeout: 10_000 })

    const t1 = Date.now()
    const totalMs = t1 - t0

    const supabaseTimings = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(e => e.name.includes('supabase') || e.name.includes('rest/v1') || e.name.includes('54321'))
        .map(e => ({ url: e.name.split('?')[0], durationMs: Math.round(e.duration) }))
    })

    console.log(`\n⏱  "Лента заказов" click → content: ${totalMs}ms`)
    console.log(`📡 Supabase:`, supabaseTimings.length ? supabaseTimings : '(none)')
    console.log()

    expect(totalMs).toBeLessThan(5000)
  })

  test('"Откликнуться" optimistic update — UI changes instantly', async ({ page }) => {
    await loginViaAPI(page.context(), 'dev@test.local', 'Test123456!')
    await page.goto('/dashboard/orders')
    await page.waitForLoadState('networkidle')

    // Wait for content to load
    await page.waitForTimeout(2000)

    const applyBtn = page.locator('[data-testid="apply-btn"]').first()
    const hasCards = await applyBtn.isVisible().catch(() => false)

    if (!hasCards) {
      console.log('⚠️  No order cards visible — skipping optimistic update test')
      test.skip()
      return
    }

    const countBefore = await page.locator('[data-testid="order-card"]').count()

    const t0 = Date.now()
    await applyBtn.click()

    // Optimistic: card should disappear within 1000ms (no waiting for server)
    await expect(page.locator('[data-testid="order-card"]')).toHaveCount(countBefore - 1, {
      timeout: 1000,
    })
    const t1 = Date.now()

    console.log(`\n⏱  "Откликнуться" → card removed: ${t1 - t0}ms (optimistic)`)
    expect(t1 - t0).toBeLessThan(1000)
  })
})
