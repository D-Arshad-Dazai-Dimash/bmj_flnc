import { NextResponse } from 'next/server'

// TODO (Неделя 3+): Реализовать подачу заявки на технадзор через .NET API
// Эндпоинт: POST /api/supervision/applications
export async function POST() {
  return NextResponse.json(
    { error: 'Функция технадзора пока не доступна' },
    { status: 404 },
  )
}
