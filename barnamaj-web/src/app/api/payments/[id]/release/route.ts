import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculatePayout } from '@/lib/payment/gateway'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: paymentId } = await params

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Load payment + order
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('id, order_id, amount_tiyn, status')
      .eq('id', paymentId)
      .single()

    if (payErr || !payment) {
      return NextResponse.json({ error: 'Платёж не найден' }, { status: 404 })
    }

    if (payment.status !== 'paid') {
      return NextResponse.json({ error: 'Платёж не оплачен' }, { status: 400 })
    }

    // Load project for executor and package tier
    const { data: project } = await supabase
      .from('projects')
      .select('executor_id, package_tier')
      .eq('id', payment.order_id)
      .single()

    if (!project?.executor_id) {
      return NextResponse.json({ error: 'Исполнитель не назначен' }, { status: 400 })
    }

    const dist = calculatePayout(payment.amount_tiyn, project.package_tier || 1)

    // Create payout records
    const payouts = [
      { user_id: project.executor_id, amount_tiyn: dist.executorTiyn, status: 'pending' as const },
    ]

    if (dist.supervisorTiyn > 0) {
      // For now, supervisor payout placeholder — will be filled in Stage 9
      payouts.push({ user_id: project.executor_id, amount_tiyn: dist.supervisorTiyn, status: 'pending' as const })
    }

    const { error: payoutErr } = await supabase.from('payouts').insert(payouts)
    if (payoutErr) {
      return NextResponse.json({ error: 'Ошибка создания выплат' }, { status: 500 })
    }

    // Mark escrow as released
    await supabase
      .from('payment_escrow')
      .update({ released_at: new Date().toISOString(), released_to_user_id: project.executor_id })
      .eq('payment_id', paymentId)

    // Log
    await supabase.from('payment_logs').insert({
      payment_id: paymentId,
      event: 'escrow_released',
      payload: { distribution: dist },
    })

    return NextResponse.json({ ok: true, distribution: dist })
  } catch (err) {
    console.error('[Release] error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
