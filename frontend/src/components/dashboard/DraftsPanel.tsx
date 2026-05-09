'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Trash2, X } from 'lucide-react'
import { listDrafts, removeDraft, draftPreviewTitle, type TzDraft } from '@/hooks/useTzDraft'

interface Props {
  open:    boolean
  onClose: () => void
  onPick:  (d: TzDraft) => void
}

/**
 * Модалка-список незавершённых черновиков ТЗ.
 * Открывается из карточки "Черновики (N)" на странице создания заказа.
 */
export default function DraftsPanel({ open, onClose, onPick }: Props) {
  const [drafts, setDrafts] = useState<TzDraft[]>([])

  useEffect(() => { if (open) setDrafts(listDrafts()) }, [open])

  function handleRemove(id: string) {
    removeDraft(id)
    setDrafts(listDrafts())
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg max-h-[80vh] rounded-2xl border border-border bg-bg-card flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="p-1.5 rounded-lg bg-accent/15">
                <FileText className="w-4 h-4 text-accent-light" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-base">Черновики ТЗ</p>
                <p className="text-xs text-text-faint">Продолжите с того места, где остановились</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-text-faint hover:text-text-muted hover:bg-bg-hover transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {drafts.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-text-muted">
                  Нет сохранённых черновиков
                </p>
              )}

              {drafts.map(d => {
                const userMsgs = d.messages.filter(m => m.role === 'user').length
                return (
                  <div
                    key={d.id}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-bg-surface px-3 py-3 hover:border-accent/40 transition-colors"
                  >
                    <button
                      onClick={() => onPick(d)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium text-text-base truncate">
                        {draftPreviewTitle(d)}
                      </p>
                      <p className="text-xs text-text-faint mt-0.5">
                        {userMsgs} реплик · {new Date(d.savedAt).toLocaleString('ru-KZ', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </button>
                    <button
                      onClick={() => handleRemove(d.id)}
                      title="Удалить черновик"
                      className="p-1.5 rounded-lg text-text-faint hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
