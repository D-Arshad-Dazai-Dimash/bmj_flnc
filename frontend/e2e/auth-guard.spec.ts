import { test, expect } from '@playwright/test'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/dashboard/clans',
  '/dashboard/tests',
  '/dashboard/profile',
  '/dashboard/settings',
  '/dashboard/orders',
  '/dashboard/projects',
  '/dashboard/create-project',
  '/dashboard/find-teams',
]

test.describe('Auth Guard — редирект без авторизации', () => {

  for (const route of PROTECTED_ROUTES) {
    test(`${route} → редирект на /auth`, async ({ page }) => {
      // ── ФИкс: полная очистка перед проверкой ──
      await page.context().clearCookies()

      // Очищаем localStorage/sessionStorage (может упасть если домен ещё не открыт)
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })

      await page.goto(route, { waitUntil: 'domcontentloaded' })

      // ── Фикс: даём Auth Guard время отработать (isLoading → false → redirect) ──
      await page.waitForURL(/\/auth/, { timeout: 15_000 })
      await expect(page).toHaveURL(/\/auth/)
    })
  }
})
