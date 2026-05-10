import { test, expect } from '@playwright/test'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

function uniqueEmail(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10_000)}@test.local`
}

test.describe('Auth logout session invalidation', () => {
  test('logout clears cookies and /me returns 401', async ({ request }) => {
    const email = uniqueEmail('logout')
    const password = 'Test123!'

    const register = await request.post(`${API}/api/auth/register`, {
      data: {
        email,
        password,
        name: 'Logout E2E',
        accountType: 1,
      },
    })
    expect(register.ok()).toBeTruthy()

    const meBefore = await request.get(`${API}/api/auth/me`)
    expect(meBefore.status()).toBe(200)

    const logout = await request.post(`${API}/api/auth/logout`)
    expect(logout.ok()).toBeTruthy()

    const meAfter = await request.get(`${API}/api/auth/me`)
    expect(meAfter.status()).toBe(401)
  })
})
