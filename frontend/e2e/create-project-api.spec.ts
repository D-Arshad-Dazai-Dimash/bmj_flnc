import { test, expect } from '@playwright/test'

const AUTH_TOKEN = 'e2e-token'
const AUTH_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'e2e@barnamaj.dev',
  role: 'Member',
  profileId: '22222222-2222-2222-2222-222222222222',
  profileName: 'E2E Profile',
  accountType: 'Developer',
}

test.describe('Create Project API flow', () => {
  test('submits project via backend API with clientProfileId', async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null

    await page.addInitScript(([token, user]) => {
      localStorage.setItem('barnamaj_token', token)
      localStorage.setItem('barnamaj_user', JSON.stringify(user))
    }, [AUTH_TOKEN, AUTH_USER] as [string, typeof AUTH_USER])

    await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: AUTH_USER.id,
          email: AUTH_USER.email,
        }),
      })
    })

    await page.route('http://localhost:5000/api/projects', async route => {
      const request = route.request()
      capturedBody = request.postDataJSON() as Record<string, unknown>

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '33333333-3333-3333-3333-333333333333',
          title: String(capturedBody?.title ?? 'N/A'),
          description: String(capturedBody?.description ?? ''),
          budget: capturedBody?.budget ?? null,
          deadline: capturedBody?.deadline ?? null,
          status: 'Open',
          clientProfileId: AUTH_USER.profileId,
          clientProfileName: AUTH_USER.profileName,
          clientProfileType: 'Individual',
          executorProfileId: null,
          executorProfileName: null,
          applicationCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      })
    })

    await page.goto('/ru/dashboard/create-project', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: 'Проект под ключ' }).click()
    await page.getByPlaceholder('Разработка платформы для...').fill('E2E MVP Project')
    await page.getByPlaceholder('Опишите задачу подробнее...').fill('Нужен backend-first поток создания проекта')
    await page.getByRole('button', { name: 'Опубликовать заказ' }).click()

    await expect(page.getByText('Заказ опубликован!')).toBeVisible()

    expect(capturedBody).not.toBeNull()
    expect(capturedBody?.['clientProfileId']).toBe(AUTH_USER.profileId)
    expect(capturedBody).not.toHaveProperty('client_id')
  })
})
