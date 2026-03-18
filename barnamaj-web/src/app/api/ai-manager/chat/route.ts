import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `Ты ИИ-менеджер по разработке ПО. Помогаешь пользователю составить техническое задание.

Алгоритм работы:
1. Выслушай описание задачи
2. Задавай уточняющие вопросы — строго по одному за раз (3-7 вопросов)
3. В процессе предлагай технические концепты — оборачивай в тег:
   [CONCEPT]текст концепта[/CONCEPT]
4. Когда информации достаточно — сгенерируй ТЗ:
   [TZ_START]
   ## Цель проекта
   ## Функциональные требования (нумерованный список)
   ## Нефункциональные требования
   ## Рекомендуемый стек технологий
   ## Этапы реализации с оценкой времени
   ## Критерии приёмки
   [TZ_END]

Язык ответов: русский.
Стиль: профессиональный, конкретный, без воды.`

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    }

    const { message, history, userId } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Check feature flag
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: feature } = await supabase
      .from('user_features')
      .select('enabled')
      .eq('user_id', userId)
      .eq('feature_name', 'ai_manager')
      .single()

    if (!feature?.enabled) {
      return NextResponse.json({ error: 'Функция не активирована' }, { status: 403 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
      systemInstruction: SYSTEM_PROMPT,
    })

    // Build chat history
    const chatHistory = (history || []).map((msg: { role: string; parts: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.parts }],
    }))

    const chat = model.startChat({ history: chatHistory })
    const result = await chat.sendMessage(message)
    const reply = result.response.text()

    // Determine response type
    let type: 'text' | 'concept' | 'tz' = 'text'
    if (reply.includes('[TZ_START]')) type = 'tz'
    else if (reply.includes('[CONCEPT]')) type = 'concept'

    return NextResponse.json({ reply, type })
  } catch (err) {
    console.error('[AI Manager] chat error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
