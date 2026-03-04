import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Ты — ИИ-ассистент платформы Barnamaj (IT-маркетплейс Казахстана).
Твоя задача: помочь заказчику составить чёткое техническое задание (ТЗ) через дружелюбный диалог на русском языке.

Веди разговор поэтапно, задавай по 1-2 вопроса за раз:
1. Что хочет создать (идея, продукт, цель)
2. Целевая аудитория
3. Ключевые функции (3-5 основных)
4. Технические предпочтения (стек, платформа)
5. Бюджет (в тенге, KZT)
6. Сроки

Когда соберёшь достаточно информации (обычно 4-6 обменов), сформируй финальное ТЗ.
В конце ОБЯЗАТЕЛЬНО выведи JSON-блок в таком формате (и только его, без лишних слов после):

\`\`\`json
{
  "ready": true,
  "title": "Краткое название проекта",
  "description": "Подробное ТЗ: цель, аудитория, функции, требования...",
  "budget": 500000,
  "order_type": "PROJECT"
}
\`\`\`

order_type может быть: PROJECT, OUTSTAFF, AUDIT, SUPERVISION, CONSULTATION
budget — число в KZT (без символов и пробелов)

Будь краток, конкретен, дружелюбен. Отвечай только на русском языке.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
      return new Response(
        JSON.stringify({ error: 'API ключ не настроен. Добавьте ANTHROPIC_API_KEY в .env.local' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
