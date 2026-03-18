import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getSystemPrompt(specialization: string) {
  return `Ты технический интервьюер на IT платформе. Проводишь аттестацию разработчика по ${specialization}.
Правила:
- Задавай вопросы строго по одному
- После каждого ответа давай краткую оценку (1-2 предложения)
- Задай ровно 10 вопросов — от простых к сложным
- После 10-го ответа выдай итог в теге:
  [RESULT]{"level":"junior|middle|senior","score":0-100,"feedback":"развёрнутый отзыв"}[/RESULT]
Язык: русский. Тон: профессиональный, поддерживающий.`
}

// POST /api/attestation — start or continue attestation chat
export async function POST(req: NextRequest) {
  try {
    const { specialization, messages } = await req.json()

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
      return Response.json(
        { error: 'API ключ не настроен. Добавьте ANTHROPIC_API_KEY в .env.local' },
        { status: 503 }
      )
    }

    if (!specialization || !['frontend', 'backend', 'fullstack', 'mobile'].includes(specialization)) {
      return Response.json({ error: 'Некорректная специализация' }, { status: 400 })
    }

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'messages обязателен' }, { status: 400 })
    }

    const stream = await client.messages.stream({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: getSystemPrompt(specialization),
      messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Ошибка ИИ'
    return Response.json({ error: msg }, { status: 500 })
  }
}
