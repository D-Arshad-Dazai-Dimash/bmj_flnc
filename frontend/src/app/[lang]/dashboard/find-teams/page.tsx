'use client'
import { motion } from 'framer-motion'
import { Search, Users, Star } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { api, ProfileSummaryDto, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'

export default function FindTeamsPage() {
  const [query,    setQuery]    = useState('')
  const [profiles, setProfiles] = useState<ProfileSummaryDto[]>([])
  const [loading,  setLoading]  = useState(true)
  const [errMsg,   setErrMsg]   = useState<string | null>(null)

  const load = useCallback((q: string) => {
    setLoading(true)
    setErrMsg(null)
    api.profiles.search({ q: q || undefined, page: 1, pageSize: 50 })
      .then(data => setProfiles(data ?? []))
      .catch(e => setErrMsg(e instanceof ApiError ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load('') }, [load])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => load(query), 400)
    return () => clearTimeout(timer)
  }, [query, load])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-accent/15"><Search className="w-5 h-5 text-accent" /></div>
        <div>
          <h1 className="text-xl font-bold text-text-base">Поиск команд</h1>
          <p className="text-sm text-text-muted">Найдите подходящую команду разработчиков</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по названию или описанию..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-bg-card border border-border text-text-base placeholder:text-text-faint text-sm focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
      ) : errMsg ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-400">{errMsg}</div>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-12 flex flex-col items-center gap-3 text-center">
          <Users className="w-10 h-10 text-text-faint" />
          <p className="text-text-muted">Команды не найдены</p>
          <p className="text-xs text-text-faint max-w-xs">
            {query ? 'Попробуйте изменить поисковый запрос' : 'Пока нет зарегистрированных команд'}
          </p>
        </div>
      ) : (
          <div className="grid gap-3">
          {profiles.map(profile => (
            <div key={profile.id} className="rounded-[10px] border border-border bg-bg-card p-5 flex items-center justify-between gap-4 hover:bg-bg-elevated hover:border-border-focus transition-all">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-[510] text-text-base">{profile.name}</h3>
                  {profile.isVerified && (
                    <span className="chip" style={{ color: '#4ade80', background: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.25)' }}>✓ Верифицирован</span>
                  )}
                  <span className="chip">
                    {profile.accountType}
                  </span>
                </div>
                {profile.bio && (
                  <p className="text-sm text-text-muted mt-1 line-clamp-1">{profile.bio}</p>
                )}
                <p className="text-xs text-text-faint mt-1.5">
                  <Users className="w-3 h-3 inline mr-1" />{profile.memberCount} участников
                </p>
              </div>
              <Button variant="outline" size="sm">Связаться</Button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

