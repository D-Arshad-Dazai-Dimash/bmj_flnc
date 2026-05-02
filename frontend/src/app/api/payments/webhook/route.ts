import { NextResponse } from 'next/server'

// TODO (Неделя 2): Вебхук платёжной системы должен обрабатываться в .NET API
// Эндпоинт: POST /api/payments/webhook (c HMAC проверкой)
export async function POST() {
  return NextResponse.json(
    { error: 'Вебхук ещё не имплементирован' },
    { status: 404 },
  )
}
