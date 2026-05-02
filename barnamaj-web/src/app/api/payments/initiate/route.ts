import { NextResponse } from 'next/server'

// TODO (Неделя 2): Реализовать инициацию платежа через .NET API POST /api/payments/initiate
// Пока паятежная система не имплементирована в .NET
export async function POST() {
  return NextResponse.json(
    { error: 'Платёжная система ещё не доступна' },
    { status: 404 },
  )
}
