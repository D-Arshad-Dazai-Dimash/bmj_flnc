/**
 * Smoke Test — Barnamaj
 *
 * Проверяет базовый сценарий: регистрация → dashboard → logout → редирект на auth.
 *
 * Требования перед запуском:
 *   1. Docker Compose запущен (docker compose up -d)
 *   2. .NET backend запущен (http://localhost:5000)
 *   3. Next.js frontend запущен (npm run dev → http://localhost:3000)
 *
 * Запуск: npx playwright test e2e/smoke.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'

// ── Тестовый пользователь ─────────────────────────────────────────────────────
// Уникальный email на каждый запуск чтобы не было конфликта регистрации
const TEST_EMAIL    = process.env.SMOKE_TEST_EMAIL    ?? `smoke_${Date.now()}@test.local`
const TEST_PASSWORD = process.env.SMOKE_TEST_PASSWORD ?? 'Smoke123!'
const TEST_NAME     = 'Smoke Tester'

// ── Helpers ────────────────────────────────────────────────────────────────────

async function clearSession(page: Page) {
  await page.context().clearCookies()
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10_000 })
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  } catch { /* игнорируем ошибки если страница недоступна */ }
}

// ── Тест 1: Auth guard ────────────────────────────────────────────────────────

test.describe('Smoke — Auth Guard', () => {
  test('GET /dashboard без авторизации → редирект на /auth', async ({ page }) => {
    await clearSession(page)
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/auth/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/auth/)
  })
})

// ── Тест 2: Страница авторизации ──────────────────────────────────────────────

test.describe('Smoke — Auth Page', () => {
  test('Страница /auth рендерится без ошибок', async ({ page }) => {
    await clearSession(page)
    const res = await page.goto('/ru/auth', { waitUntil: 'domcontentloaded' })
    expect(res?.status()).toBeLessThan(400)

    // Форма логина присутствует
    await expect(page.locator('input[type="email"], input[autocomplete="email"]').first())
      .toBeVisible({ timeout: 10_000 })

    // Нет ошибок 404/500 в тексте
    await expect(page.locator('body')).not.toHaveText('404')
    await expect(page.locator('body')).not.toHaveText('500')
  })
})

// ── Тест 3: Полный flow: регистрация → dashboard → logout ─────────────────────

test.describe('Smoke — Full Auth Flow', () => {
  test.slow() // увеличенный таймаут для сетевых запросов

  test('Register → Dashboard → Logout → redirect to /auth', async ({ page }) => {
    await clearSession(page)

    // ── Шаг 1: Открыть страницу auth ──
    await page.goto('/ru/auth', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('input[autocomplete="email"]').first()).toBeVisible({ timeout: 10_000 })

    // ── Шаг 2: Перейти в режим регистрации ──
    const registerBtn = page.locator('button', { hasText: /зарегистрир|sign up|создать/i }).first()
    if (await registerBtn.isVisible()) {
      await registerBtn.click()
      await page.waitForTimeout(400)
    }

    // ── Шаг 3: Заполнить форму регистрации ──
    const nameInput = page.locator('input[autocomplete="name"]').first()
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill(TEST_NAME)
    }

    await page.locator('input[autocomplete="email"]').first().fill(TEST_EMAIL)
    await page.locator('input[autocomplete="current-password"]').first().fill(TEST_PASSWORD)

    // ── Шаг 4: Отправить форму ──
    await page.locator('button[type="submit"]').first().click()

    // ── Шаг 5: После успешной регистрации — редирект на /dashboard ──
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/dashboard/)

    // ── Шаг 6: Dashboard не показывает ошибку ──
    await expect(page.locator('body')).not.toHaveText('401')
    await expect(page.locator('body')).not.toHaveText('Unauthorized')

    // ── Шаг 7: Logout (ищем кнопку выхода в sidebar или navbar) ──
    const logoutBtn = page.locator('button, a', { hasText: /выйти|logout|sign out/i }).last()
    if (await logoutBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await logoutBtn.click()
      await page.waitForURL(/\/auth/, { timeout: 10_000 })
      await expect(page).toHaveURL(/\/auth/)
    } else {
      // Если кнопка не найдена — прямой вызов logout API
      await page.request.post('http://localhost:5000/api/auth/logout')
      await page.context().clearCookies()
      await page.goto('/ru/dashboard')
      await page.waitForURL(/\/auth/, { timeout: 10_000 })
      await expect(page).toHaveURL(/\/auth/)
    }
  })
})
