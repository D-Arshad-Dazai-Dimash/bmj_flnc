import { NextResponse } from 'next/server'

// TODO (Неделя 2): Релиз эскроу должен обрабатываться в .NET API POST /api/payments/{id}/release
export async function POST() {
  return NextResponse.json(
    { error: 'Релиз эскроу ещё не доступен' },
    { status: 404 },
  )
}

