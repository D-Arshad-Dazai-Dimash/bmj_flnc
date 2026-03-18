// ── Payment Gateway Abstraction ──────────────────────────────────────────────

export interface CreatePaymentParams {
  orderId: string
  amountTiyn: number
  description: string
  returnUrl: string
}

export interface CreatePaymentResult {
  gatewayPaymentId: string
  redirectUrl: string
}

export interface RefundResult {
  success: boolean
  refundId: string
}

export interface PaymentGateway {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>
  checkStatus(gatewayPaymentId: string): Promise<'pending' | 'paid' | 'failed' | 'refunded'>
  refund(gatewayPaymentId: string, amountTiyn?: number): Promise<RefundResult>
}

// ── Mock Payment Gateway ────────────────────────────────────────────────────
// Симулирует платёж для разработки. Статус переходит в "paid" мгновенно.

const mockPayments = new Map<string, { status: string; createdAt: number }>()

export class MockPaymentGateway implements PaymentGateway {
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    mockPayments.set(id, { status: 'pending', createdAt: Date.now() })

    // Auto-transition to paid after 2 seconds
    setTimeout(() => {
      const p = mockPayments.get(id)
      if (p && p.status === 'pending') p.status = 'paid'
    }, 2000)

    return {
      gatewayPaymentId: id,
      redirectUrl: `${params.returnUrl}?payment_id=${id}&mock=true`,
    }
  }

  async checkStatus(gatewayPaymentId: string): Promise<'pending' | 'paid' | 'failed' | 'refunded'> {
    const p = mockPayments.get(gatewayPaymentId)
    if (!p) return 'failed'
    return p.status as 'pending' | 'paid' | 'failed' | 'refunded'
  }

  async refund(gatewayPaymentId: string): Promise<RefundResult> {
    const p = mockPayments.get(gatewayPaymentId)
    if (p) p.status = 'refunded'
    return { success: true, refundId: `refund_${gatewayPaymentId}` }
  }
}

// ── HMAC Webhook Verification ───────────────────────────────────────────────

export async function verifyWebhookHmac(
  payload: string,
  secret: string,
  signature: string,
): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return expected === signature
}

// ── Payout Calculator ───────────────────────────────────────────────────────

export interface PayoutDistribution {
  executorTiyn: number
  supervisorTiyn: number
  platformTiyn: number
}

export function calculatePayout(amountTiyn: number, packageTier: number): PayoutDistribution {
  if (packageTier === 3) {
    const supervisorTiyn = Math.round(amountTiyn * 0.03)
    const platformTiyn = Math.round(amountTiyn * 0.07)
    const executorTiyn = amountTiyn - supervisorTiyn - platformTiyn
    return { executorTiyn, supervisorTiyn, platformTiyn }
  }
  // Пакет 1 и 2: 100% исполнителю (комиссия уже добавлена к сумме клиента)
  return { executorTiyn: amountTiyn, supervisorTiyn: 0, platformTiyn: 0 }
}

// ── Factory ─────────────────────────────────────────────────────────────────

export function createPaymentGateway(): PaymentGateway {
  // В продакшне проверить PAYMENT_GATEWAY_KEY и вернуть реальный шлюз
  return new MockPaymentGateway()
}
