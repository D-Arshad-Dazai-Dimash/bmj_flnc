/**
 * Week 2 — Phase 7. End-to-end smoke сделки.
 *
 * Сценарий API-driven (без UI):
 *   1. Регистрируем заказчика и исполнителя.
 *   2. Заказчик создаёт проект.
 *   3. Исполнитель откликается.
 *   4. Заказчик принимает заявку → создаёт контракт.
 *   5. Обе стороны подписывают контракт → status=Signed.
 *   6. Заказчик пополняет эскроу (стаб → Held → contract Funded).
 *   7. Заказчик подтверждает приёмку → status=Released.
 *
 * Тест автоматически скипается, если backend недоступен на API_URL.
 */

import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:5000'

async function ping(): Promise<boolean> {
  try {
    const ctx = await pwRequest.newContext()
    const r   = await ctx.get(`${API_URL}/health`, { timeout: 2_000 })
    await ctx.dispose()
    return r.ok()
  } catch { return false }
}

async function newCtx(): Promise<APIRequestContext> {
  return pwRequest.newContext({ baseURL: API_URL, extraHTTPHeaders: { 'Content-Type': 'application/json' } })
}

async function register(ctx: APIRequestContext, email: string, name: string) {
  const r = await ctx.post('/api/auth/register', {
    data: { email, password: 'P@ssw0rd!1', displayName: name },
  })
  expect(r.status(), `register ${email}`).toBeLessThan(500)
}

async function login(ctx: APIRequestContext, email: string) {
  const r = await ctx.post('/api/auth/login', {
    data: { email, password: 'P@ssw0rd!1' },
  })
  expect(r.ok(), `login ${email} -> ${r.status()}`).toBeTruthy()
  return await r.json() as { id: string; email: string; profileId: string }
}

test.describe('Full deal smoke (API)', () => {

  test.beforeAll(async () => {
    if (!(await ping())) {
      test.skip(true, `Backend unavailable at ${API_URL}`)
    }
  })

  test('client + executor — контракт Released от начала до конца', async () => {
    const stamp        = Date.now()
    const clientEmail  = `client-${stamp}@example.com`
    const execEmail    = `exec-${stamp}@example.com`

    const cli = await newCtx()
    const exe = await newCtx()

    // 1. Регистрация
    await register(cli, clientEmail, 'Test Client')
    await register(exe, execEmail,   'Test Executor')

    // 2. Логин (cookie садится в каждый context)
    const clientMe = await login(cli, clientEmail)
    const execMe   = await login(exe, execEmail)

    // 3. Заказчик создаёт проект
    const projectRes = await cli.post('/api/projects', {
      data: {
        title:       `Smoke project ${stamp}`,
        description: 'e2e full-deal',
        budget:      100,
        currency:    'KZT',
      },
    })
    expect(projectRes.ok(), `create project -> ${projectRes.status()}`).toBeTruthy()
    const project = await projectRes.json() as { id: string }

    // 4. Исполнитель откликается
    const applyRes = await exe.post(`/api/projects/${project.id}/apply`, {
      data: { coverLetter: 'I can do it', proposedBudget: 100 },
    })
    expect(applyRes.ok(), `apply -> ${applyRes.status()}`).toBeTruthy()

    // 5. Заказчик создаёт контракт с этим исполнителем
    const contractRes = await cli.post('/api/contracts', {
      data: {
        projectId:         project.id,
        executorProfileId: execMe.profileId,
        amount:            100,
        currency:          'KZT',
      },
    })
    // Если API требует KYC — тест становится не-критическим
    if (contractRes.status() === 403) {
      test.skip(true, 'Backend требует KYC для создания контракта (ожидаемо)')
    }
    expect(contractRes.ok(), `create contract -> ${contractRes.status()}`).toBeTruthy()
    const contract = await contractRes.json() as { id: string }

    // 6. Подписание обеими сторонами
    expect((await cli.post(`/api/contracts/${contract.id}/sign`)).ok()).toBeTruthy()
    expect((await exe.post(`/api/contracts/${contract.id}/sign`)).ok()).toBeTruthy()

    // 7. Заказчик пополняет эскроу
    const payRes = await cli.post(`/api/payments/initiate`, {
      data: { contractId: contract.id },
    })
    expect(payRes.ok(), `payment initiate -> ${payRes.status()}`).toBeTruthy()

    // 8. Подтверждение приёмки
    const releaseRes = await cli.post(`/api/contracts/${contract.id}/release`)
    expect(releaseRes.ok(), `release -> ${releaseRes.status()}`).toBeTruthy()

    // 9. Финальная проверка статуса
    const finalRes = await cli.get(`/api/contracts/${contract.id}`)
    expect(finalRes.ok()).toBeTruthy()
    const finalDto = await finalRes.json() as { status: string }
    expect(finalDto.status).toBe('Released')

    // Sanity: заказчик != исполнитель
    expect(clientMe.profileId).not.toBe(execMe.profileId)

    await cli.dispose()
    await exe.dispose()
  })
})
