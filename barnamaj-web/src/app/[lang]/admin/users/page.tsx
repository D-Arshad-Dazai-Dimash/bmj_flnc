'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { UserRole } from '@/lib/database.types'
import { Users, Search, Shield, Ban } from 'lucide-react'

interface UserRow {
  id: string
  full_name: string
  role: string
  is_admin: boolean
  is_blocked: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    let q = supabase.from('profiles').select('id, full_name, role, is_admin, is_blocked, created_at').order('created_at', { ascending: false }).limit(100)
    if (search) q = q.ilike('full_name', `%${search}%`)
    const { data } = await q
    setUsers((data as UserRow[]) ?? [])
    setLoading(false)
  }, [supabase, search])

  useEffect(() => { load() }, [load])

  const toggleAdmin = async (id: string, current: boolean) => {
    await supabase.from('profiles').update({ is_admin: !current }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_admin: !current } : u))
  }

  const toggleBlock = async (id: string, current: boolean) => {
    await supabase.from('profiles').update({ is_blocked: !current }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_blocked: !current } : u))
  }

  const changeRole = async (id: string, role: UserRole) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-500/15">
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <h1 className="text-xl font-bold text-text-base">Пользователи</h1>
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
                <th className="text-left px-4 py-3 text-xs font-medium text-text-faint">Имя</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-faint">Роль</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-text-faint">Админ</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-text-faint">Статус</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-faint">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-bg-hover/50 transition-colors">
                  <td className="px-4 py-3 text-text-base">{u.full_name}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value as UserRole)}
                      className="px-2 py-1 rounded bg-bg-base border border-border text-xs text-text-base"
                    >
                      <option value="freelancer">Freelancer</option>
                      <option value="client">Client</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleAdmin(u.id, u.is_admin)}
                      className={`p-1 rounded ${u.is_admin ? 'text-red-400' : 'text-text-faint hover:text-text-muted'}`}
                      title={u.is_admin ? 'Снять админа' : 'Назначить админом'}
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_blocked ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                      {u.is_blocked ? 'Заблокирован' : 'Активен'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleBlock(u.id, u.is_blocked)}
                      className={`p-1.5 rounded-lg transition-colors ${u.is_blocked ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-text-faint hover:text-red-400 hover:bg-red-500/10'}`}
                      title={u.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                    >
                      <Ban className="w-4 h-4" />
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
