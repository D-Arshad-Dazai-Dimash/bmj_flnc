import { test, expect } from '@playwright/test'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

function uniqueEmail(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10_000)}@test.local`
}

function readCookieValue(rawSetCookie: string[] | undefined, cookieName: string): string | null {
  if (!rawSetCookie?.length) return null

  for (const header of rawSetCookie) {
    const parts = header.split(';')[0]
    const [name, value] = parts.split('=')
    if (name?.trim() === cookieName && value) {
      return value.trim()
    }
  }

  return null
}

test.describe('Refresh rotation and reuse detection', () => {
  test('reusing old refresh token revokes whole family', async ({ request }) => {
    const email = uniqueEmail('rotation')
    const password = 'Test123!'

    const register = await request.post(`${API}/api/auth/register`, {
      data: {
        email,
        password,
        name: 'Rotation E2E',
        accountType: 1,
      },
    })
    expect(register.ok()).toBeTruthy()

    const oldRefresh = readCookieValue(register.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie').map(h => h.value), 'refresh_token')
    expect(oldRefresh).not.toBeNull()

    const refresh1 = await request.post(`${API}/api/auth/refresh`)
    expect(refresh1.ok()).toBeTruthy()

    const newRefresh = readCookieValue(refresh1.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie').map(h => h.value), 'refresh_token')
    expect(newRefresh).not.toBeNull()
    expect(newRefresh).not.toBe(oldRefresh)

    // Атака: повторное использование уже rotated токена из старой куки.
    const reuseResponse = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `refresh_token=${oldRefresh}`,
      },
    })
    expect(reuseResponse.status).toBe(401)

    // После reuse-detection family должна быть отозвана — даже новая refresh-cookie больше невалидна.
    const refreshAfterReuse = await request.post(`${API}/api/auth/refresh`)
    expect(refreshAfterReuse.status()).toBe(401)
  })
})
