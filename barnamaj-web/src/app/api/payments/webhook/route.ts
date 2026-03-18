import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookHmac } from '@/lib/payment/gateway'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-webhook-signature') || ''
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'mock_secret'

    // Verify HMAC-SHA256 signature
    const valid = await verifyWebhookHmac(body, secret, signature)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(body)
    const { gatewayPaymentId, status } = payload

    if (!gatewayPaymentId || !status) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Update payment status
    const { error: updateErr } = await supabase
      .from('payments')
      .update({ status })
      .eq('gateway_payment_id', gatewayPaymentId)

    if (updateErr) {
      console.error('[Webhook] update error:', updateErr)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    // Log the event
    const { data: payment } = await supabase
      .from('payments')
      .select('id')
      .eq('gateway_payment_id', gatewayPaymentId)
      .single()

    if (payment) {
      await supabase.from('payment_logs').insert({
        payment_id: payment.id,
        event: `status_changed_to_${status}`,
        payload,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Webhook] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
