import { NextRequest } from 'next/server'

/**
 * ИИ-помощник для составления ТЗ через диалог.
 *
 * Используется Groq (OpenAI-compatible API) — низкая латентность и щедрые
 * лимиты. Ключ читается из `GROQ_API_KEY`, модель из `GROQ_MODEL`
 * (по умолчанию llama-3.3-70b-versatile).
 *
 * Эндпоинт стримит обратно plain-text-чанки (не SSE), так что клиент
 * читает их через `ReadableStream.getReader()` без парсинга event-stream.
 */

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

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL      = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey || apiKey === 'your_key_here') {
      return new Response(
        JSON.stringify({ error: 'API ключ не настроен. Добавьте GROQ_API_KEY в .env.local' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const upstream = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       MODEL,
        temperature: 0.4,
        max_tokens:  1024,
        stream:      true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    })

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '')
      return new Response(
        JSON.stringify({ error: `Groq ${upstream.status}: ${text.slice(0, 300)}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Парсим SSE от Groq и пере-стримим клиенту plain-text deltas.
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const readable = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader()
        let buffer = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            // SSE-фреймы разделены пустой строкой ("\n\n"), внутри `data: ...`
            const parts = buffer.split('\n\n')
            buffer = parts.pop() ?? ''
            for (const part of parts) {
              const line = part.trim()
              if (!line.startsWith('data:')) continue
              const payload = line.slice(5).trim()
              if (payload === '[DONE]') { controller.close(); return }
              try {
                const obj = JSON.parse(payload)
                const delta = obj?.choices?.[0]?.delta?.content
                if (typeof delta === 'string' && delta.length > 0) {
                  controller.enqueue(encoder.encode(delta))
                }
              } catch { /* пропускаем некорректный фрейм */ }
            }
          }
        } catch (e) {
          controller.error(e)
          return
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':      'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control':     'no-cache',
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

