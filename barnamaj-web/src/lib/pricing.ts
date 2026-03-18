// ── Тарифные пакеты — расчёт комиссии ────────────────────────────────────────
// Все суммы внутри хранятся в ТИЫНАХ (× 100). Отображать пользователю в тенге (÷ 100).

export interface PricingResult {
  package: 1 | 2 | 3
  orderAmountTiyn: number
  commissionTiyn: number
  totalFromClientTiyn: number
  payoutToExecutorTiyn: number
  includesTechSupervision: boolean
  techSupervisorShareTiyn: number
  platformShareTiyn: number
}

/**
 * Рассчитать комиссию и пакет на основе суммы заказа.
 *
 * Пакет 1: ≤ 100 000 ₸ → 600 ₸ фиксированная комиссия (добавляется к сумме)
 * Пакет 2: 100 001–500 000 ₸ → 1% (добавляется к сумме)
 * Пакет 3: > 500 000 ₸ → 10% ВКЛЮЧЕНА в сумму + технадзор
 *
 * @param orderAmountTiyn сумма заказа в тиынах (1 тенге = 100 тиын)
 */
export function calculateCommission(orderAmountTiyn: number): PricingResult {
  if (orderAmountTiyn <= 0) {
    throw new Error('Сумма заказа должна быть больше нуля')
  }

  const TIER1_LIMIT = 10_000_000   // 100 000 ₸ в тиынах
  const TIER2_LIMIT = 50_000_000   // 500 000 ₸ в тиынах
  const FIXED_FEE   = 60_000       // 600 ₸ в тиынах

  // Пакет 1: ≤ 100 000 ₸
  if (orderAmountTiyn <= TIER1_LIMIT) {
    return {
      package: 1,
      orderAmountTiyn,
      commissionTiyn: FIXED_FEE,
      totalFromClientTiyn: orderAmountTiyn + FIXED_FEE,
      payoutToExecutorTiyn: orderAmountTiyn,
      includesTechSupervision: false,
      techSupervisorShareTiyn: 0,
      platformShareTiyn: FIXED_FEE,
    }
  }

  // Пакет 2: 100 001–500 000 ₸
  if (orderAmountTiyn <= TIER2_LIMIT) {
    const commission = Math.round(orderAmountTiyn * 0.01)
    return {
      package: 2,
      orderAmountTiyn,
      commissionTiyn: commission,
      totalFromClientTiyn: orderAmountTiyn + commission,
      payoutToExecutorTiyn: orderAmountTiyn,
      includesTechSupervision: false,
      techSupervisorShareTiyn: 0,
      platformShareTiyn: commission,
    }
  }

  // Пакет 3: > 500 000 ₸ — 10% ВКЛЮЧЕНА в сумму
  const commission = Math.round(orderAmountTiyn * 0.10)
  const executorPayout = orderAmountTiyn - commission
  const supervisorShare = Math.round(orderAmountTiyn * 0.03)  // 3% технадзору
  const platformShare = commission - supervisorShare            // 7% платформе

  return {
    package: 3,
    orderAmountTiyn,
    commissionTiyn: commission,
    totalFromClientTiyn: orderAmountTiyn,  // комиссия включена
    payoutToExecutorTiyn: executorPayout,
    includesTechSupervision: true,
    techSupervisorShareTiyn: supervisorShare,
    platformShareTiyn: platformShare,
  }
}

/** Конвертация тиыны → тенге для отображения */
export function tiynToTenge(tiyn: number): number {
  return tiyn / 100
}

/** Конвертация тенге → тиыны для хранения */
export function tengeToTiyn(tenge: number): number {
  return Math.round(tenge * 100)
}

/** Форматирование суммы в тенге */
export function formatTenge(tenge: number): string {
  return `${tenge.toLocaleString('ru-RU')} ₸`
}
