'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api, AuditLogDto } from '@/lib/api'
import { FileText, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react'

const ACTION_COLORS: Record<string, string> = {
  'wallet.adjust':    'text-amber-400',
  'specialty.grant':  'text-violet-400',
  'specialty.revoke': 'text-red-400',
}

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] ?? 'text-sky-400'
  return (
    <span className={`font-mono text-xs ${color}`}>{action}</span>
  )
}

function formatDt(iso: string) {
  return new Date(iso).toLocaleString('ru-KZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function AdminAuditPage() {
  const { isAtLeast } = useAuth()
  const [logs,      setLogs]      = useState<AuditLogDto[]>([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [search,    setSearch]    = useState('')

  const pageSize = 50
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.adminAudit.getLogs({
        page: p,
        pageSize,
        action: q || undefined,
      })
      setLogs(data.items)
      setTotal(data.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page, search) }, [load, page, search])

  // Restrict to HeadAdmin
  if (!isAtLeast('HeadAdmin')) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted text-sm">
        Доступ только для HeadAdmin
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/15">
            <FileText className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-base">Журнал аудита</h1>
            <p className="text-sm text-text-muted">{total} событий</p>
          </div>
        </div>
        <button
          onClick={() => load(page, search)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border-subtle text-text-muted hover:text-text-base transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Фильтр по действию (wallet.adjust, specialty...)"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2 text-sm bg-surface-card border border-border-subtle rounded-xl text-text-base placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      {loading && logs.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">Загрузка...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">Событий не найдено</div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-surface-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-hover">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Время</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Действие</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Администратор</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Цель</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">IP</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Данные</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDt(log.createdAt)}</td>
                  <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                  <td className="px-4 py-3 text-text-base">{log.adminEmail}</td>
                  <td className="px-4 py-3 text-text-muted">{log.targetEmail ?? log.targetUserId ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">{log.ipAddress ?? '—'}</td>
                  <td className="px-4 py-3 max-w-xs">
                    {log.payload ? (
                      <pre className="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap max-h-20">
                        {JSON.stringify(JSON.parse(log.payload), null, 2)}
                      </pre>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-text-muted">
          <span>Страница {page} из {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-1.5 rounded-lg border border-border-subtle hover:text-text-base disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-1.5 rounded-lg border border-border-subtle hover:text-text-base disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
