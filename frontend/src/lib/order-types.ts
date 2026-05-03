// Лёгкий тип уровня домена. Заменяет supabase-сгенерированный database.types.
// Если бэкенд расширит набор — добавить значение здесь.
export type OrderType =
  | 'fixed'
  | 'hourly'
  | 'PROJECT'
  | 'CONSULTATION'
  | 'AUDIT'
  | 'OUTSTAFF'
  | 'SUPERVISION'
