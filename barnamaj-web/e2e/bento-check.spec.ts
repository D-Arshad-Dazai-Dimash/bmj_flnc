import { test, expect } from '@playwright/test'

/**
 * Каждая публичная страница использует CSS-классы grid для Bento-раскладки.
 * Проверяем, что на каждой странице есть хотя бы один grid-контейнер
 * с реальными дочерними элементами внутри.
 */
const BENTO_PAGES = [
  {
    path: '/escrow',
    name: 'Эскроу',
    gridSelector: '.grid',
    minChildren: 2,
    contentMarkers: ['эскроу', 'защит', 'сделк'],
  },
  {
    path: '/pricing',
    name: 'Тарифы',
    gridSelector: '.grid',
    minChildren: 3,
    contentMarkers: ['бесплатно', 'про', 'бизнес'],
  },
  {
    path: '/safety',
    name: 'Безопасность',
    gridSelector: '.grid',
    minChildren: 3,
    contentMarkers: ['верификац', 'шифрован', 'данн'],
  },
  {
    path: '/clans',
    name: 'Кланы',
    gridSelector: '.grid',
    minChildren: 2,
    contentMarkers: ['клан', 'команд'],
  },
  {
    path: '/',
    name: 'Главная',
    gridSelector: '.grid',
    minChildren: 2,
    contentMarkers: ['barnamaj'],
  },
]

test.describe('Bento-Check — сетки отрисованы и наполнены', () => {

  for (const pg of BENTO_PAGES) {
    test(`${pg.name} (${pg.path}) — grid-блоки рендерятся`, async ({ page }) => {
      await page.goto(pg.path, { waitUntil: 'domcontentloaded' })

      // ── Фикс: принудительно скроллим всю страницу, чтобы whileInView сработал ──
      // framer-motion может оставить opacity:0 если whileInView не триггернулся в headless
      await page.evaluate(async () => {
        const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
        for (let i = 0; i < document.body.scrollHeight; i += 400) {
          window.scrollTo(0, i)
          await delay(100)
        }
      })

      // Ждём, пока появится хотя бы один grid-контейнер
      const grids = page.locator(pg.gridSelector)
      await expect(grids.first()).toBeVisible({ timeout: 8000 })

      // Считаем кол-во grid-контейнеров
      const gridCount = await grids.count()
      expect(
        gridCount,
        `${pg.name}: нет ни одного grid-блока`
      ).toBeGreaterThanOrEqual(1)

      // Проверяем, что первый grid содержит достаточно дочерних элементов
      const firstGrid = grids.first()
      const childCount = await firstGrid.locator('> *').count()
      expect(
        childCount,
        `${pg.name}: grid пустой (${childCount} детей, нужно ≥${pg.minChildren})`
      ).toBeGreaterThanOrEqual(pg.minChildren)

      // Проверяем маркеры контента (текст страницы непустой и релевантный)
      const bodyText = (await page.locator('body').innerText()).toLowerCase()
      for (const marker of pg.contentMarkers) {
        expect(
          bodyText,
          `${pg.name}: не найден контент-маркер "${marker}"`
        ).toContain(marker)
      }
    })
  }
})
