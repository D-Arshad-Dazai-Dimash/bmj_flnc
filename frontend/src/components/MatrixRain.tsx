'use client'

import { useEffect, useRef } from 'react'

interface MatrixRainProps {
  /** Базовая скорость (мс на тик, default: 40) */
  speed?: number
  className?: string
}

// Одиночные символы дублируются 4× — создают «шум» между токенами
const SINGLES = Array.from({ length: 4 }, () =>
  Array.from('<>/{}[];:=+-.!?|~0123456789')
).flat()

const TOKENS: string[] = [
  ...SINGLES,
  // HTML
  '<div>', '</div>', '<span>', '</span>', '<p>', '</p>',
  '<h1>', '</h1>', '<h2>', '</h2>',
  '<button>', '</button>', '<input/>', '<form>', '</form>',
  '<label>', '</label>', '<nav>', '</nav>',
  '<section>', '<header>', '<footer>', '<img/>', '<a>', '</a>',
  // CSS / Tailwind
  '.cls', '#id', 'rem', 'px', 'vh', 'vw',
  'flex', 'grid', 'block', 'none', 'auto', 'rgba(', 'var(--',
  // JS / TS
  '=>', '===', '!==', '&&', '||', '??', '?.',
  'async', 'await', 'const', 'let', 'type',
  'return', 'null', 'void', 'true', 'false',
  'export', 'import', 'from', '()', '=>{',
  // Backend / HTTP
  'GET', 'POST', 'PUT', 'DELETE',
  '200', '201', '400', '401', '404', '500',
  'res.', 'req.', 'ctx.', 'db.',
]

// Палитра Barnamaj
const PALETTE    = ['#638ad4', '#4947ab', '#376fb1', '#4898bc', '#7a58ac', '#c98fb1']
const BG_FADE    = 'rgba(3, 6, 25, 0.065)' // bg-base с прозрачностью — хвост
const HEAD_CLR   = '#e4e8ff'               // голова капли
const GLITCH_CLR = '#ffffff'               // вспышка глитча

// Размеры колонок
const COL_W  = 88  // шире чем самый длинный токен — без перекрытий
const LINE_H = 17  // шаг строки

interface Col {
  x: number      // x-позиция
  row: number    // текущая строка головы
  pace: number   // тиков на 1 шаг (1=быстро, 4=медленно)
  tick: number   // счётчик
  color: string  // цвет хвоста
}

function rnd(a: number, b: number) { return a + Math.random() * (b - a) }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function makeCol(x: number): Col {
  return {
    x,
    row:   -Math.floor(rnd(1, 24)),
    pace:  Math.floor(rnd(1, 5)),
    tick:  Math.floor(rnd(0, 5)),
    color: pick(PALETTE),
  }
}

/**
 * MatrixRain — анимация «Матрица» на Canvas.
 *
 * Улучшения:
 * - Широкие колонки (88px) — токены не перекрываются
 * - Индивидуальная скорость каждой колонки
 * - Glow у головы капли
 * - Глитч-вспышка (~2% шанс)
 * - Плавный хвост через BG_FADE overlay
 */
export default function MatrixRain({ speed = 40, className = '' }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cols: Col[] = []
    let timerId: ReturnType<typeof setInterval>

    function init() {
      if (!canvas || !ctx) return
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const count = Math.floor(canvas.width / COL_W)
      cols = Array.from({ length: count }, (_, i) => makeCol(i * COL_W))
    }
    init()

    function draw() {
      if (!canvas || !ctx) return
      // Хвост: полупрозрачный overlay цвета bg-base
      ctx.fillStyle = BG_FADE
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < cols.length; i++) {
        const col = cols[i]
        col.tick++
        if (col.tick < col.pace) continue
        col.tick = 0

        const isGlitch = Math.random() < 0.018
        const headY = col.row * LINE_H
        const bodyY = headY + LINE_H

        // Тело — цвет палитры
        if (bodyY > 0 && bodyY < canvas.height + LINE_H) {
          ctx.font = '13px "Fira Code", monospace'
          ctx.fillStyle = col.color
          ctx.shadowBlur = 0
          ctx.fillText(pick(TOKENS), col.x, bodyY)
        }

        // Голова — яркий HEAD_CLR с glow (или глитч)
        if (headY > 0 && headY < canvas.height) {
          ctx.font = 'bold 13px "Fira Code", monospace'
          if (isGlitch) {
            ctx.fillStyle  = GLITCH_CLR
            ctx.shadowColor = '#c0d8ff'
            ctx.shadowBlur  = 16
          } else {
            ctx.fillStyle  = HEAD_CLR
            ctx.shadowColor = HEAD_CLR
            ctx.shadowBlur  = 7
          }
          ctx.fillText(pick(TOKENS), col.x, headY)
          ctx.shadowBlur = 0
        }

        col.row++
        if (col.row * LINE_H > canvas.height + LINE_H * 6) {
          cols[i] = makeCol(col.x)
        }
      }
    }

    timerId = setInterval(draw, speed)

    const ro = new ResizeObserver(() => {
      init()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    })
    ro.observe(canvas)

    return () => {
      clearInterval(timerId)
      ro.disconnect()
      ctx.shadowBlur = 0
    }
  }, [speed])

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
      aria-hidden="true"
    />
  )
}
