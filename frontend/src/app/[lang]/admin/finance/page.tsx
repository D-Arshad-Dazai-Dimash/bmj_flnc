'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api, AdminWalletSummaryDto } from '@/lib/api'
import { Wallet, RefreshCw, Search, ChevronUp, ChevronDown } from 'lucide-react'

function formatMoney(v: number) {
  return new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(v)
}

export default function AdminFinancePage() {
  const { isAtLeast } = useAuth()
  const [wallets, setWallets] = useState<AdminWalletSummaryDto[]>([])
  const [filtered, setFiltered] = useState<AdminWalletSummaryDto[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Adjust balance modal state
  const [adjustTarget, setAdjustTarget] = useState<AdminWalletSummaryDto | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustDesc, setAdjustDesc] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [adjustError, setAdjustError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.adminFinance.wallets()
      setWallets(data)
      setFiltered(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(q ? wallets.filter(w => w.email.toLowerCase().includes(q)) : wallets)
  }, [search, wallets])

  const totalAvailable = wallets.reduce((s, w) => s + w.availableBalance, 0)
  const totalFrozen    = wallets.reduce((s, w) => s + w.frozenBalance, 0)

  const handleAdjust = async () => {
    if (!adjustTarget) return
    const amount = parseFloat(adjustAmount)
    if (isNaN(amount) || amount === 0) { setAdjustError('Введите корректную сумму'); return }
    setAdjusting(true)
    setAdjustError(null)
    try {
      await api.adminFinance.adjust(adjustTarget.userId, amount, adjustDesc || undefined)
      setAdjustTarget(null)
      setAdjustAmount('')
      setAdjustDesc('')
      await load()
    } catch (e: unknown) {
      setAdjustError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setAdjusting(false)
    }
  }

  const canAdjust = isAtLeast('SeniorAdmin')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/15">
          <Wallet className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Финансы</h1>
          <p className="text-sm text-text-muted">Кошельки пользователей</p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="ml-auto p-2 rounded-lg text-text-muted hover:text-text-base hover:bg-bg-hover transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted mb-1">Общий баланс платформы</p>
          <p className="text-2xl font-bold text-text-base">{formatMoney(totalAvailable)}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted mb-1">Заморожено (эскроу)</p>
          <p className="text-2xl font-bold text-text-base">{formatMoney(totalFrozen)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по email..."
              className="w-full bg-bg-base border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400 p-4">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-faint text-xs">
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-right px-4 py-3">Доступно</th>
                <th className="text-right px-4 py-3">Заморожено</th>
                <th className="text-right px-4 py-3">На выводе</th>
                {canAdjust && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.walletId} className="border-b border-border last:border-0 hover:bg-bg-hover/50 transition-colors">
                  <td className="px-4 py-3 text-text-base">{w.email}</td>
                  <td className="px-4 py-3 text-right text-text-base font-mono">{formatMoney(w.availableBalance)}</td>
                  <td className="px-4 py-3 text-right text-text-muted font-mono">{formatMoney(w.frozenBalance)}</td>
                  <td className="px-4 py-3 text-right text-text-muted font-mono">{formatMoney(w.pendingWithdrawal)}</td>
                  {canAdjust && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setAdjustTarget(w); setAdjustError(null); setAdjustAmount(''); setAdjustDesc('') }}
                        className="text-xs text-accent hover:underline"
                      >
                        Корректировать
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={canAdjust ? 5 : 4} className="text-center py-8 text-text-faint">Кошельки не найдены</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust modal */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-text-base">Корректировка баланса</h3>
            <p className="text-sm text-text-muted">{adjustTarget.email}</p>
            <p className="text-sm text-text-muted">Текущий баланс: <span className="text-text-base font-medium">{formatMoney(adjustTarget.availableBalance)}</span></p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Сумма (+ пополнение, − списание)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:border-accent"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button onClick={() => setAdjustAmount(v => String((parseFloat(v)||0)+1000))} className="p-0.5 text-text-faint hover:text-text-base"><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => setAdjustAmount(v => String((parseFloat(v)||0)-1000))} className="p-0.5 text-text-faint hover:text-text-base"><ChevronDown className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Причина (необязательно)</label>
                <input
                  value={adjustDesc}
                  onChange={e => setAdjustDesc(e.target.value)}
                  placeholder="Бонус, возврат..."
                  className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {adjustError && <p className="text-xs text-red-400">{adjustError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setAdjustTarget(null)}
                className="flex-1 py-2 rounded-lg border border-border text-sm text-text-muted hover:text-text-base hover:bg-bg-hover transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjusting}
                className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {adjusting ? 'Сохранение...' : 'Применить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
