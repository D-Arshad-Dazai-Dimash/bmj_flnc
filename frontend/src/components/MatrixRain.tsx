'use client'

import { useEffect, useRef } from 'react'

interface MatrixRainProps {
  /** CSS цвет символов (default: var(--color-accent)) */
  color?: string
  /** Размер шрифта в пикселях (default: 14) */
  fontSize?: number
  /** Скорость капель в мс на тик (default: 50) */
  speed?: number
  className?: string
}

// Набор символов: казахский кириллица + латиница + цифры
const CHARS =
  'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюяABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ӘҒҚҢӨҰҮҺәғқңөұүһ'

/**
 * MatrixRain — анимация «Матрица» на Canvas.
 *
 * Доступность: автоматически останавливается при prefers-reduced-motion.
 */
export default function MatrixRain({
  color = 'var(--color-accent, #00ff88)',
  fontSize = 14,
  speed = 50,
  className = '',
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Уважаем prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    let timerId: ReturnType<typeof setInterval>

    // Колонки
    let cols: number
    let drops: number[]

    function init() {
      if (!canvas) return
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      cols  = Math.floor(canvas.width / fontSize)
      drops = Array(cols).fill(1)
    }

    init()

    function draw() {
      if (!canvas || !ctx) return
      // Полупрозрачный overlay для «хвоста»
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = color
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        ctx.fillText(char, i * fontSize, drops[i] * fontSize)

        // Сбрасываем каплю случайно, когда она упала за нижний край
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    timerId = setInterval(draw, speed)

    // Resize
    const observer = new ResizeObserver(() => {
      init()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    })
    observer.observe(canvas)

    return () => {
      clearInterval(timerId)
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [color, fontSize, speed])

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
      aria-hidden="true"
    />
  )
}
