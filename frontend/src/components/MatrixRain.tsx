'use client'

import { useEffect, useRef } from 'react'

interface MatrixRainProps {
  /** Размер шрифта в пикселях (default: 14) */
  fontSize?: number
  /** Скорость капель в мс на тик (default: 50) */
  speed?: number
  className?: string
}

// Dev-символы: программирование + цифры
const CHARS = '<>/\\{}[];:=+-*!?@#$%^&|~.,_()=>0123456789'

// Barnamaj brand palette — цвет на каждый столбец
const PALETTE = ['#638ad4', '#4947ab', '#376fb1', '#4898bc', '#7a58ac', '#c98fb1']
const HEAD_COLOR = '#e4e8ff'

/**
 * MatrixRain — анимация «Матрица» на Canvas.
 *
 * Доступность: автоматически останавливается при prefers-reduced-motion.
 */
export default function MatrixRain({
  fontSize = 14,
  speed = 50,
  className = '',
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let timerId: ReturnType<typeof setInterval>

    let cols: number
    let drops: number[]
    let colColors: string[]

    function init() {
      if (!canvas) return
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      cols      = Math.floor(canvas.width / fontSize)
      drops     = Array(cols).fill(1)
      colColors = Array.from({ length: cols }, () =>
        PALETTE[Math.floor(Math.random() * PALETTE.length)]
      )
    }

    init()

    function draw() {
      if (!canvas || !ctx) return
      // Overlay — цвет фона bg-base с прозрачностью (хвост капли)
      ctx.fillStyle = 'rgba(3, 6, 25, 0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const y = drops[i] * fontSize

        // Голова капли — яркий бело-голубой
        ctx.fillStyle = HEAD_COLOR
        ctx.fillText(char, i * fontSize, y)

        // След капли — цвет столбца
        ctx.fillStyle = colColors[i]
        if (drops[i] > 1) {
          const prevChar = CHARS[Math.floor(Math.random() * CHARS.length)]
          ctx.fillText(prevChar, i * fontSize, (drops[i] - 1) * fontSize)
        }

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
          // Назначить новый цвет столбца при сбросе
          colColors[i] = PALETTE[Math.floor(Math.random() * PALETTE.length)]
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
      observer.disconnect()
    }
  }, [fontSize, speed])

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
      aria-hidden="true"
    />
  )
}
