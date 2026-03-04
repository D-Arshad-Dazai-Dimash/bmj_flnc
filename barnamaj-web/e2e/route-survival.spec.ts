import { test, expect } from '@playwright/test'

const PUBLIC_ROUTES = [
  { path: '/',        name: 'Главная' },
  { path: '/escrow',  name: 'Эскроу' },
  { path: '/pricing', name: 'Тарифы' },
  { path: '/safety',  name: 'Безопасность' },
  { path: '/clans',   name: 'Кланы' },
]

test.describe('Маршрут выживания — полный обход', () => {

  test('Главная → Футер → все публичные страницы без 404', async ({ page }) => {
    // ── Шаг 1: Заход на главную ──
    const homeRes = await page.goto('/')
    expect(homeRes?.status()).toBeLessThan(400)
    await expect(page.locator('body')).not.toHaveText('404')
    await expect(page.locator('body')).not.toHaveText('not found', { ignoreCase: true })

    // ── Шаг 2: Проверяем, что HeroSection отрисовался ──
    await expect(page.locator('section').first()).toBeVisible({ timeout: 8000 })

    // ── Шаг 3: Скролл до футера ──
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    const footer = page.locator('footer')
    if (await footer.count() > 0) {
      await expect(footer.first()).toBeVisible()
    }

    // ── Шаг 4: Обход ВСЕХ публичных маршрутов ──
    for (const route of PUBLIC_ROUTES) {
      const res = await page.goto(route.path)
      const status = res?.status() ?? 0

      // Критерий: НЕ 404, НЕ 500
      expect(status, `${route.name} (${route.path}) вернул ${status}`).toBeLessThan(400)

      // Страница не должна быть пустой «белой»
      const bodyText = await page.locator('body').innerText()
      expect(
        bodyText.trim().length,
        `${route.name} — пустая страница (белый экран)`
      ).toBeGreaterThan(50)

      // Не отображается компонент 404
      await expect(
        page.locator('text=Страница не найдена')
      ).not.toBeVisible({ timeout: 2000 })
    }
  })
})
