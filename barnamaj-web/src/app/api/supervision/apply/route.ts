import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if user is senior fullstack
    const { data: profile } = await supabase
      .from('profiles')
      .select('attestation_level, attestation_specialization')
      .eq('id', userId)
      .single()

    if (!profile || profile.attestation_level !== 'senior' || profile.attestation_specialization !== 'fullstack') {
      return NextResponse.json(
        { error: 'Только senior fullstack разработчики могут подать заявку на технадзор' },
        { status: 403 },
      )
    }

    // Create application
    const { error } = await supabase
      .from('supervision_applications')
      .insert({ user_id: userId })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Заявка уже подана' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Supervision] apply error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
