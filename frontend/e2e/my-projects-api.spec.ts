import { test, expect } from '@playwright/test'

const AUTH_TOKEN = 'e2e-token'
const AUTH_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'e2e@barnamaj.dev',
  role: 'Member',
  profileId: '22222222-2222-2222-2222-222222222222',
  profileName: 'E2E Profile',
  accountType: 'Client',
}

const MOCK_PROJECTS = [
  {
    id: 'aaaa0001-0000-0000-0000-000000000001',
    title: 'E2E Test Project Open',
    description: 'Открытый проект для E2E теста',
    budget: 150000,
    deadline: '2025-12-31T00:00:00Z',
    status: 'Open',
    clientProfileId: AUTH_USER.profileId,
    clientProfileName: AUTH_USER.profileName,
    clientProfileType: 'Individual',
    applicationCount: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'aaaa0002-0000-0000-0000-000000000002',
    title: 'E2E Test Project In Progress',
    description: 'Проект в работе',
    budget: 80000,
    deadline: null,
    status: 'InProgress',
    clientProfileId: AUTH_USER.profileId,
    clientProfileName: AUTH_USER.profileName,
    clientProfileType: 'Individual',
    applicationCount: 1,
    createdAt: new Date().toISOString(),
  },
]

test.describe('My Projects page — backend-first flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(([token, user]) => {
      localStorage.setItem('barnamaj_token', token)
      localStorage.setItem('barnamaj_user', JSON.stringify(user))
    }, [AUTH_TOKEN, AUTH_USER] as [string, typeof AUTH_USER])

    // Mock Supabase auth (browser-side)
    await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: AUTH_USER.id, email: AUTH_USER.email }),
      })
    })

    // Mock GET /api/projects/my
    await page.route('**/api/projects/my', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PROJECTS),
        })
      } else {
        await route.continue()
      }
    })
  })

  test('loads projects from backend API (not Supabase)', async ({ page }) => {
    // Ensure NO direct Supabase table reads happen
    let supabaseTableRead = false
    await page.route('**/rest/v1/projects*', async route => {
      supabaseTableRead = true
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto('/ru/dashboard/projects', { waitUntil: 'domcontentloaded' })

    // Both project cards should appear
    await expect(page.getByText('E2E Test Project Open')).toBeVisible()
    await expect(page.getByText('E2E Test Project In Progress')).toBeVisible()

    // Application count badge must be visible for open project
    await expect(page.getByText(/3\s*(отклик|отклика|откликов)/)).toBeVisible()

    // No direct Supabase reads — backend API only
    expect(supabaseTableRead).toBe(false)
  })

  test('cancel project calls PATCH /api/projects/{id}/status via backend', async ({ page }) => {
    let patchedBody: Record<string, unknown> | null = null
    let patchedId: string | null = null

    await page.route('**/api/projects/*/status', async route => {
      const url = route.request().url()
      // Extract project id from URL
      const match = url.match(/\/api\/projects\/([^/]+)\/status/)
      patchedId = match ? match[1] : null
      patchedBody = route.request().postDataJSON() as Record<string, unknown>

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_PROJECTS[0], status: 'Cancelled' }),
      })
    })

    await page.goto('/ru/dashboard/projects', { waitUntil: 'domcontentloaded' })

    // Wait for cards to render
    await expect(page.getByText('E2E Test Project Open')).toBeVisible()

    // Click cancel on first (open) project
    await page.getByRole('button', { name: 'Отменить' }).first().click()

    // Patch must have been called with correct project id and status
    expect(patchedId).toBe(MOCK_PROJECTS[0].id)
    expect(patchedBody?.['status']).toBe('Cancelled')
  })
})
