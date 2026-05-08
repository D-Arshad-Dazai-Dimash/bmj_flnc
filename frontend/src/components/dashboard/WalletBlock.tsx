'use client'

import { useAuth } from '@/context/AuthContext'
import { api, WalletHistoryDto, TransactionDto } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, RefreshCw, ArrowUpRight } from 'lucide-react'

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(amount)
}

function TransactionRow({ tx }: { tx: TransactionDto }) {
  const isPositive = tx.amount >= 0
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        </div>
        <div>
          <p className="text-sm text-text-base">{tx.description ?? tx.type}</p>
          <p className="text-xs text-text-faint">{new Date(tx.createdAt).toLocaleDateString('ru-KZ')}</p>
        </div>
      </div>
      <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{formatMoney(tx.amount)}
      </span>
    </div>
  )
}

export default function WalletBlock() {
  const { isAuthenticated } = useAuth()
  const [history, setHistory] = useState<WalletHistoryDto | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.wallet.history(1, 10)
      setHistory(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки кошелька')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) load()
  }, [isAuthenticated])

  if (!isAuthenticated) return null

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-text-base">Кошелёк</h3>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-base hover:bg-bg-hover transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Balance */}
      {history && (
        <div className="p-4 bg-gradient-to-br from-accent/10 to-transparent">
          <p className="text-xs text-text-muted mb-1">Доступный баланс</p>
          <p className="text-3xl font-bold text-text-base">{formatMoney(history.wallet.availableBalance)}</p>
          <div className="mt-3 flex gap-4 text-xs text-text-faint">
            <span>Заморожено: {formatMoney(history.wallet.frozenBalance)}</span>
            <span>На выводе: {formatMoney(history.wallet.pendingWithdrawal)}</span>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="p-4">
        {isLoading && (
          <div className="flex justify-center py-6">
            <RefreshCw className="w-5 h-5 text-text-faint animate-spin" />
          </div>
        )}
        {error && <p className="text-sm text-red-400 text-center py-4">{error}</p>}
        {history && history.transactions.length === 0 && (
          <p className="text-sm text-text-faint text-center py-4">Транзакций пока нет</p>
        )}
        {history && history.transactions.map(tx => (
          <TransactionRow key={tx.id} tx={tx} />
        ))}
        {history && history.total > 10 && (
          <div className="mt-3 flex justify-end">
            <button className="text-xs text-accent flex items-center gap-1 hover:underline">
              Все транзакции <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
