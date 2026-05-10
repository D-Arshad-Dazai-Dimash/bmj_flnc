'use client'

import * as React from 'react'

/**
 * Tooltip — пасс-сквозной враппер, добавляющий нативный `title=""`
 * к дочернему элементу. Используем браузерный tooltip, чтобы
 * подсказка НИКОГДА не перекрывала кликабельный элемент:
 * браузер показывает её с задержкой и сбоку от курсора, а не
 * поверх контента.
 *
 * API сохранён (`label`, `side`, `children`) для совместимости.
 * `side` игнорируется — позицию выбирает ОС/браузер.
 */
export function Tooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactElement
  side?: 'top' | 'bottom'
}) {
  if (React.isValidElement(children)) {
    const existing = (children.props as { title?: string }).title
    return React.cloneElement(
      children as React.ReactElement<{ title?: string }>,
      { title: existing ?? label },
    )
  }
  return (
    <span title={label} className="inline-flex">
      {children}
    </span>
  )
}
