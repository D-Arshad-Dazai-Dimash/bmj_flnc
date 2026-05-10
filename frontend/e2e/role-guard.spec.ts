import { test, expect, type Page } from '@playwright/test'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

type MockRole = 'Member' | 'Moderator' | 'SeniorAdmin' | 'HeadAdmin'

function mockAuthMe(page: Page, role: MockRole) {
  return page.route(`${API}/api/auth/me`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'e2e@barnamaj.dev',
        role,
        profileId: '22222222-2222-2222-2222-222222222222',
        profileName: role === 'Member' ? 'Member E2E' : 'Admin E2E',
        accountType: 'Company',
      }),
    })
  })
}

test.describe('Role guard redirects', () => {
  test('admin cannot stay in /dashboard and is redirected to /admin', async ({ page }) => {
    await mockAuthMe(page, 'SeniorAdmin')
    await page.goto('/ru/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/admin/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/admin/)
  })

  test('member cannot stay in /admin and is redirected to /dashboard', async ({ page }) => {
    await mockAuthMe(page, 'Member')
    await page.goto('/ru/admin', { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
