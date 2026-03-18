'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { Megaphone, Plus, Trash2, GripVertical } from 'lucide-react'

interface Ann { id: string; title: string; body: string; is_active: boolean; sort_order: number; created_at: string }

export default function AdminAnnouncementsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<Ann[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', body: '' })
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('sort_order', { ascending: true })
    setItems((data as Ann[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!form.title.trim()) return
    setAdding(true)
    const { error } = await supabase.from('announcements').insert({
      title: form.title,
      body: form.body,
      sort_order: items.length + 1,
    })
    if (!error) {
      setForm({ title: '', body: '' })
      await load()
    }
    setAdding(false)
  }

  const remove = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const toggle = async (id: string, active: boolean) => {
    await supabase.from('announcements').update({ is_active: !active }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_active: !active } : i))
  }

  // Drag & drop reorder (HTML5 DnD)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const onDragStart = (i: number) => setDragIdx(i)
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    const updated = [...items]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(i, 0, moved)
    setItems(updated)
    setDragIdx(i)
  }
  const onDragEnd = async () => {
    setDragIdx(null)
    // Save new order
    for (let i = 0; i < items.length; i++) {
      if (items[i].sort_order !== i + 1) {
        await supabase.from('announcements').update({ sort_order: i + 1 }).eq('id', items[i].id)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500/15">
          <Megaphone className="w-5 h-5 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-text-base">Объявления</h1>
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-border bg-bg-card p-4 space-y-3">
        <input
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          placeholder="Заголовок"
          className="w-full px-3 py-2 rounded-lg bg-bg-base border border-border text-sm text-text-base focus:outline-none focus:border-accent transition-colors"
        />
        <textarea
          value={form.body}
          onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
          placeholder="Текст объявления"
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-bg-base border border-border text-sm text-text-base focus:outline-none focus:border-accent transition-colors resize-none"
        />
        <button
          onClick={add}
          disabled={adding || !form.title.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-accent/40 text-accent-light bg-accent/10 hover:bg-accent/20 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          {adding ? 'Добавляем...' : 'Добавить'}
        </button>
      </div>

      {/* List with drag & drop */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => onDragOver(e, i)}
              onDragEnd={onDragEnd}
              className={`rounded-xl border bg-bg-card p-4 flex items-start gap-3 cursor-grab ${
                item.is_active ? 'border-border' : 'border-border/50 opacity-60'
              } ${dragIdx === i ? 'ring-2 ring-accent/40' : ''}`}
            >
              <GripVertical className="w-4 h-4 text-text-faint mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-base text-sm">{item.title}</p>
                <p className="text-xs text-text-muted mt-1 line-clamp-2">{item.body}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggle(item.id, item.is_active)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                    item.is_active
                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                      : 'border-border text-text-faint'
                  }`}
                >
                  {item.is_active ? 'Активно' : 'Скрыто'}
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-faint hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
