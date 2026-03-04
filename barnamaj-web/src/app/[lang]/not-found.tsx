'use client'

import Link from '@/components/ui/LocaleLink'
import { motion } from 'framer-motion'
import { Home, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center px-4 text-center">
      {/* Glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-bg-card border border-border-DEFAULT">
          <AlertTriangle className="w-9 h-9 text-accent-light" />
        </div>

        <div>
          <p className="text-7xl font-extrabold font-mono text-gradient mb-2">404</p>
          <h1 className="text-2xl font-bold text-text-base mb-2">Страница не найдена</h1>
          <p className="text-text-muted max-w-sm">
            Эта страница не существует или была перемещена.
          </p>
        </div>

        <Link href="/">
          <Button variant="default" size="lg">
            <Home className="w-4 h-4 mr-2" />
            На главную
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
