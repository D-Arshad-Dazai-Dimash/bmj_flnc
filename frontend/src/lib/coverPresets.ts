/**
 * Пресеты обложек профиля. Без хранилища файлов — каждое — CSS-gradient.
 * Совпадает с back-end лимитом (0..9).
 */
export const COVER_PRESETS: { id: number; label: string; bg: string }[] = [
  { id: 0, label: 'Sunrise',   bg: 'linear-gradient(135deg,#fb923c 0%,#f43f5e 50%,#a855f7 100%)' },
  { id: 1, label: 'Ocean',     bg: 'linear-gradient(135deg,#0ea5e9 0%,#3b82f6 50%,#1e3a8a 100%)' },
  { id: 2, label: 'Aurora',    bg: 'linear-gradient(135deg,#22d3ee 0%,#a855f7 60%,#ec4899 100%)' },
  { id: 3, label: 'Forest',    bg: 'linear-gradient(135deg,#34d399 0%,#0d9488 60%,#0f172a 100%)' },
  { id: 4, label: 'Steppe',    bg: 'linear-gradient(135deg,#fde68a 0%,#f59e0b 50%,#7c2d12 100%)' },
  { id: 5, label: 'Plum',      bg: 'linear-gradient(135deg,#7c3aed 0%,#1e1b4b 100%)' },
  { id: 6, label: 'Coral',     bg: 'linear-gradient(135deg,#fda4af 0%,#fb7185 60%,#9f1239 100%)' },
  { id: 7, label: 'Slate',     bg: 'linear-gradient(135deg,#475569 0%,#0f172a 100%)' },
  { id: 8, label: 'Mint',      bg: 'linear-gradient(135deg,#a7f3d0 0%,#14b8a6 60%,#155e75 100%)' },
  { id: 9, label: 'Nebula',    bg: 'linear-gradient(135deg,#312e81 0%,#7e22ce 50%,#db2777 100%)' },
]

export function coverBg(id?: number | null): string {
  const p = COVER_PRESETS.find(c => c.id === (id ?? 0)) ?? COVER_PRESETS[0]
  return p.bg
}
