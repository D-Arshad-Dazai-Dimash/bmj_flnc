import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateCommission, tengeToTiyn } from '@/lib/pricing'
import { createPaymentGateway } from '@/lib/payment/gateway'

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Load project
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, budget, client_id, package_tier')
      .eq('id', orderId)
      .single()

    if (projErr || !project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 })
    }

    if (!project.budget || project.budget <= 0) {
      return NextResponse.json({ error: 'Бюджет не указан' }, { status: 400 })
    }

    // Calculate amounts
    const calc = calculateCommission(tengeToTiyn(project.budget))
    const gateway = createPaymentGateway()

    // Create payment via gateway
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const result = await gateway.createPayment({
      orderId: project.id,
      amountTiyn: calc.totalFromClientTiyn,
      description: `Оплата заказа ${project.id}`,
      returnUrl: `${origin}/dashboard/projects/${project.id}`,
    })

    // Save payment record
    const { error: payErr } = await supabase.from('payments').insert({
      order_id: project.id,
      payer_id: project.client_id,
      amount_tiyn: calc.totalFromClientTiyn,
      commission_tiyn: calc.commissionTiyn,
      gateway_payment_id: result.gatewayPaymentId,
      status: 'pending',
    })

    if (payErr) {
      return NextResponse.json({ error: 'Ошибка создания платежа' }, { status: 500 })
    }

    return NextResponse.json({ redirectUrl: result.redirectUrl })
  } catch (err) {
    console.error('[Payments] initiate error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
