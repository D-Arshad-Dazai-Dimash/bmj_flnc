// ── Казахстанский производственный календарь ─────────────────────────────────

/** Фиксированные государственные праздники РК (месяц 1-indexed, день) */
const KZ_FIXED_HOLIDAYS: { month: number; day: number }[] = [
  { month: 1,  day: 1  }, // Новый год
  { month: 1,  day: 2  }, // Перенос Нового года
  { month: 3,  day: 8  }, // Международный женский день
  { month: 3,  day: 21 }, // Наурыз мейрамы
  { month: 3,  day: 22 }, // Наурыз (перенос)
  { month: 3,  day: 23 }, // Наурыз (перенос)
  { month: 5,  day: 1  }, // Праздник единства народа Казахстана
  { month: 5,  day: 7  }, // День защитника Отечества
  { month: 5,  day: 9  }, // День Победы
  { month: 7,  day: 6  }, // День столицы
  { month: 8,  day: 30 }, // День Конституции
  { month: 10, day: 25 }, // День Республики
  { month: 12, day: 16 }, // День Независимости
  { month: 12, day: 17 }, // День Независимости (перенос)
]

/**
 * Курбан-айт — плавающий праздник (исламский лунный календарь).
 * Заранее вычисленные приблизительные даты.
 */
const KZ_KURBAN_AIT: Record<number, { month: number; day: number }[]> = {
  2024: [{ month: 6, day: 17 }, { month: 6, day: 18 }],
  2025: [{ month: 6, day: 7  }, { month: 6, day: 8  }],
  2026: [{ month: 5, day: 27 }, { month: 5, day: 28 }],
  2027: [{ month: 5, day: 16 }, { month: 5, day: 17 }],
  2028: [{ month: 5, day: 5  }, { month: 5, day: 6  }],
}

function isWeekend(date: Date): boolean {
  const dow = date.getDay()
  return dow === 0 || dow === 6 // воскресенье или суббота
}

function isKZHoliday(date: Date): boolean {
  const m = date.getMonth() + 1 // 1-indexed
  const d = date.getDate()
  const y = date.getFullYear()

  // Фиксированные праздники
  if (KZ_FIXED_HOLIDAYS.some(h => h.month === m && h.day === d)) return true

  // Курбан-айт
  const kurban = KZ_KURBAN_AIT[y]
  if (kurban?.some(h => h.month === m && h.day === d)) return true

  return false
}

/**
 * Рассчитывает дедлайн, прибавляя `daysCount` **рабочих** дней Казахстана
 * (без выходных и государственных праздников РК) к `startDate`.
 *
 * @example
 * // Проект начинается 1 марта 2025 (суббота), 5 рабочих дней →
 * getQazaqBusinessDays(new Date('2025-03-01'), 5)
 * // → 12 марта 2025 (пропускает вых. + Наурыз 21-23)
 */
export function getQazaqBusinessDays(startDate: Date, daysCount: number): Date {
  const result = new Date(startDate)
  result.setHours(0, 0, 0, 0)

  let remaining = daysCount
  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    if (!isWeekend(result) && !isKZHoliday(result)) {
      remaining--
    }
  }
  return result
}

/**
 * Считает количество рабочих дней РК между двумя датами (включая startDate, не включая endDate).
 */
export function countQazaqBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0
  const cur = new Date(startDate)
  cur.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (cur < end) {
    if (!isWeekend(cur) && !isKZHoliday(cur)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}
