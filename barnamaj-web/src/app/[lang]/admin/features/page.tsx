'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ToggleRight, Search } from 'lucide-react'

interface UserFeatureRow {
  id: string
  full_name: string
  ai_manager: boolean
}

export default function AdminFeaturesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [users, setUsers] = useState<UserFeatureRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Get all users with their ai_manager feature status
      let q = supabase.from('profiles').select('id, full_name').order('full_name').limit(100)
      if (search) q = q.ilike('full_name', `%${search}%`)
      const { data: profiles } = await q

      if (!profiles) { setLoading(false); return }

      // Get features for these users
      const { data: features } = await supabase
        .from('user_features')
        .select('user_id, feature_name, enabled')
        .in('user_id', profiles.map(p => p.id))
        .eq('feature_name', 'ai_manager')

      const featureMap = new Map<string, boolean>()
      features?.forEach(f => featureMap.set(f.user_id, f.enabled))

      setUsers(profiles.map(p => ({
        id: p.id,
        full_name: p.full_name,
        ai_manager: featureMap.get(p.id) ?? false,
      })))
      setLoading(false)
    }
    load()
  }, [supabase, search])

  const toggleFeature = async (userId: string, featureName: string, current: boolean) => {
    // Upsert
    const { error } = await supabase
      .from('user_features')
      .upsert({ user_id: userId, feature_name: featureName, enabled: !current }, { onConflict: 'user_id,feature_name' })

    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [featureName]: !current } : u))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/15">
          <ToggleRight className="w-5 h-5 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-text-base">Управление фичами</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени..."
          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-bg-card border border-border text-sm text-text-base focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-card border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-faint">Пользователь</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-text-faint">ИИ Менеджер ТЗ</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-bg-hover/50 transition-colors">
                  <td className="px-4 py-3 text-text-base">{u.full_name}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleFeature(u.id, 'ai_manager', u.ai_manager)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${u.ai_manager ? 'bg-emerald-500' : 'bg-border'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${u.ai_manager ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
