'use client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Rocket, Users, Search, ShieldCheck, Lightbulb,
  ArrowLeft, CheckCircle2, Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocaleRouter } from '@/hooks/useLocaleRouter'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import type { OrderType } from '@/lib/database.types'
import { calculateCommission, tengeToTiyn, tiynToTenge, formatTenge } from '@/lib/pricing'
import dynamic from 'next/dynamic'

const AiTzWizard = dynamic(() => import('@/components/dashboard/AiTzWizard'), { ssr: false })

// ── Service catalog ─────────────────────────────────────────────────────────
const SERVICE_TYPES = [
  {
    key: 'PROJECT' as OrderType,
    icon: Rocket,
    color: 'text-violet-400',
    bg:    'bg-violet-500/10 border-violet-500/30',
    title: 'Проект под ключ',
    desc:  'Полная разработка продукта с нуля — сайт, приложение, сервис',
  },
  {
    key: 'OUTSTAFF' as OrderType,
    icon: Users,
    color: 'text-blue-400',
    bg:    'bg-blue-500/10 border-blue-500/30',
    title: 'Аутстаффинг',
    desc:  'Нанять специалиста в команду на удалённой основе',
  },
  {
    key: 'AUDIT' as OrderType,
    icon: Search,
    color: 'text-amber-400',
    bg:    'bg-amber-500/10 border-amber-500/30',
    title: 'IT-Аудит',
    desc:  'Проверка кода, архитектуры, безопасности и производительности',
  },
  {
    key: 'SUPERVISION' as OrderType,
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bg:    'bg-emerald-500/10 border-emerald-500/30',
    title: 'Технадзор',
    desc:  'Контроль качества разработки ведущим техническим экспертом',
  },
  {
    key: 'CONSULTATION' as OrderType,
    icon: Lightbulb,
    color: 'text-orange-400',
    bg:    'bg-orange-500/10 border-orange-500/30',
    title: 'Консультация',
    desc:  'Экспертная сессия с PM/архитектором по вашему вопросу',
  },
]

// ── Per-type extra fields ────────────────────────────────────────────────────
type FieldDef = {
  name:        string
  label:       string
  type:        'text' | 'textarea' | 'select' | 'number' | 'date'
  placeholder?: string
  options?:    { value: string; label: string }[]
  required?:   boolean
}

const EXTRA_FIELDS: Record<OrderType, FieldDef[]> = {
  PROJECT: [
    { name: 'tech_stack',  label: 'Технологический стек',       type: 'text',     placeholder: 'React, Node.js, PostgreSQL...' },
    { name: 'team_size',   label: 'Размер команды',             type: 'select',
      options: [
        { value: '1',    label: '1 специалист' },
        { value: '2-3',  label: '2–3 специалиста' },
        { value: '4-6',  label: '4–6 специалистов' },
        { value: '7+',   label: '7+ специалистов' },
      ],
    },
    { name: 'duration',    label: 'Длительность',               type: 'select',
      options: [
        { value: '< 1 мес',   label: 'Менее 1 месяца' },
        { value: '1-3 мес',   label: '1–3 месяца' },
        { value: '3-6 мес',   label: '3–6 месяцев' },
        { value: '6+ мес',    label: 'Более 6 месяцев' },
      ],
    },
  ],
  OUTSTAFF: [
    { name: 'position',    label: 'Должность',                  type: 'text',     placeholder: 'Backend Developer, React Developer...' },
    { name: 'level',       label: 'Уровень специалиста',        type: 'select',
      options: [
        { value: 'Junior',  label: 'Junior' },
        { value: 'Middle',  label: 'Middle' },
        { value: 'Senior',  label: 'Senior' },
        { value: 'Lead',    label: 'Lead' },
      ],
    },
    { name: 'contract',    label: 'Формат занятости',           type: 'select',
      options: [
        { value: 'Полная',    label: 'Полная занятость' },
        { value: 'Частичная', label: 'Частичная занятость' },
        { value: 'Проектная', label: 'Проектная' },
      ],
    },
    { name: 'start_date',  label: 'Дата начала',                type: 'date' },
  ],
  AUDIT: [
    { name: 'codebase',    label: 'Объём кодовой базы',         type: 'select',
      options: [
        { value: '< 5k LOC',    label: 'Менее 5 000 строк' },
        { value: '5-20k LOC',   label: '5 000–20 000 строк' },
        { value: '20-100k LOC', label: '20 000–100 000 строк' },
        { value: '100k+ LOC',   label: 'Более 100 000 строк' },
      ],
    },
    { name: 'urgency',     label: 'Срочность',                  type: 'select',
      options: [
        { value: 'Высокая',  label: 'Высокая (до 3 дней)' },
        { value: 'Средняя',  label: 'Средняя (до 2 недель)' },
        { value: 'Низкая',   label: 'Низкая (до 1 месяца)' },
      ],
    },
    { name: 'report_fmt',  label: 'Формат отчёта',              type: 'select',
      options: [
        { value: 'PDF',       label: 'PDF-документ' },
        { value: 'Markdown',  label: 'Markdown (GitHub)' },
        { value: 'Устный',    label: 'Устный доклад' },
      ],
    },
  ],
  SUPERVISION: [
    { name: 'phase',       label: 'Фаза проекта',               type: 'select',
      options: [
        { value: 'Планирование', label: 'Планирование' },
        { value: 'Разработка',   label: 'Разработка' },
        { value: 'Тестирование', label: 'Тестирование' },
        { value: 'Запуск',       label: 'Запуск/MVP' },
      ],
    },
    { name: 'check_freq',  label: 'Частота проверок',           type: 'select',
      options: [
        { value: 'Ежедневно', label: 'Ежедневно' },
        { value: 'Еженедельно', label: 'Еженедельно' },
        { value: '2 раза/мес', label: '2 раза в месяц' },
      ],
    },
    { name: 'sup_duration', label: 'Длительность надзора',      type: 'select',
      options: [
        { value: '1 мес',  label: '1 месяц' },
        { value: '3 мес',  label: '3 месяца' },
        { value: '6 мес',  label: '6 месяцев' },
        { value: '12 мес', label: '12 месяцев' },
      ],
    },
  ],
  CONSULTATION: [
    { name: 'topics',      label: 'Тема консультации',          type: 'text',     placeholder: 'Архитектура, выбор стека, управление командой...' },
    { name: 'duration_h',  label: 'Длительность (часы)',        type: 'select',
      options: [
        { value: '1', label: '1 час' },
        { value: '2', label: '2 часа' },
        { value: '3', label: '3 часа' },
        { value: '4', label: '4 часа' },
      ],
    },
    { name: 'format',      label: 'Формат встречи',             type: 'select',
      options: [
        { value: 'Online',  label: 'Онлайн (Zoom/Meet)' },
        { value: 'Offline', label: 'Офлайн (Алматы/Астана)' },
      ],
    },
    { name: 'session_date', label: 'Желаемая дата',             type: 'date' },
  ],
  fixed:  [],
  hourly: [],
}

// ── Build description from extra fields ─────────────────────────────────────
function buildDescription(
  baseDesc: string,
  type: OrderType,
  extras: Record<string, string>,
): string {
  const defs = EXTRA_FIELDS[type]
  const lines = defs
    .filter(f => extras[f.name])
    .map(f => `${f.label}: ${extras[f.name]}`)
  return lines.length ? `${baseDesc}\n\n---\n${lines.join('\n')}` : baseDesc
}

// ── Field input component ────────────────────────────────────────────────────
function FieldInput({ def, value, onChange }: {
  def:      FieldDef
  value:    string
  onChange: (name: string, val: string) => void
}) {
  const base = 'w-full px-3 py-2.5 rounded-lg bg-bg-base border border-border text-text-base placeholder:text-text-faint text-sm focus:outline-none focus:border-accent transition-colors'

  if (def.type === 'textarea') {
    return (
      <textarea
        name={def.name}
        value={value}
        onChange={e => onChange(def.name, e.target.value)}
        rows={4}
        placeholder={def.placeholder}
        required={def.required}
        className={`${base} resize-none`}
      />
    )
  }

  if (def.type === 'select' && def.options) {
    return (
      <select
        name={def.name}
        value={value}
        onChange={e => onChange(def.name, e.target.value)}
        className={base}
      >
        <option value="">— Выберите —</option>
        {def.options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      name={def.name}
      type={def.type}
      value={value}
      onChange={e => onChange(def.name, e.target.value)}
      placeholder={def.placeholder}
      required={def.required}
      className={base}
    />
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function CreateProjectPage() {
  const { user }  = useAuth()
  const router    = useLocaleRouter()

  const [selectedType, setSelectedType] = useState<OrderType | null>(null)
  const [base, setBase] = useState({ title: '', description: '', budget: '', deadline: '' })
  const [extras, setExtras] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errMsg,  setErrMsg]  = useState<string | null>(null)
  const [showAi,  setShowAi]  = useState(false)

  const handleBase = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setBase(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleExtra = (name: string, val: string) =>
    setExtras(prev => ({ ...prev, [name]: val }))

  const selectType = (t: OrderType) => {
    setSelectedType(t)
    setExtras({})
    setErrMsg(null)
  }

  const back = () => {
    setSelectedType(null)
    setErrMsg(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      setErrMsg('Не удалось определить ваш профиль. Выйдите и войдите снова.')
      return
    }
    if (!selectedType) return

    setLoading(true)
    setErrMsg(null)

    try {
      const fullDesc = buildDescription(base.description, selectedType, extras)
      const budgetNum = base.budget ? Number(base.budget) : undefined

      await api.projects.create({
        title:           base.title,
        description:     fullDesc || undefined,
        clientProfileId: user.id,
        budget:          budgetNum,
        deadline:        base.deadline || undefined,
      })
      setSuccess(true)
      setTimeout(() => router.push('/dashboard/projects'), 1800)
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : 'Ошибка создания заказа')
    } finally {
      setLoading(false)
    }
  }

  const svc = selectedType ? SERVICE_TYPES.find(s => s.key === selectedType)! : null

  // ── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto mt-16 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-12 text-center flex flex-col items-center gap-4"
      >
        <CheckCircle2 className="w-14 h-14 text-emerald-400" />
        <p className="text-xl font-semibold text-emerald-300">Заказ опубликован!</p>
        <p className="text-sm text-text-muted">Исполнители уже видят ваш заказ. Перенаправляем...</p>
      </motion.div>
    )
  }

  // ── AI apply handler ───────────────────────────────────────────────────────
  function applyAiResult(result: { title: string; description: string; budget: number; order_type: OrderType }) {
    setBase({
      title:       result.title,
      description: result.description,
      budget:      result.budget ? String(result.budget) : '',
      deadline:    '',
    })
    setExtras({})
    setSelectedType(result.order_type)
    setShowAi(false)
  }

  // ── Catalog ────────────────────────────────────────────────────────────────
  if (!selectedType) {
    return (
      <>
      {showAi && (
        <AiTzWizard
          onApply={applyAiResult}
          onClose={() => setShowAi(false)}
        />
      )}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="space-y-8 max-w-3xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-text-base">Разместить заказ</h1>
            <p className="text-text-muted mt-1">Выберите тип услуги, чтобы разместить заказ</p>
          </div>
          <button
            onClick={() => setShowAi(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-accent/40 bg-accent/10 text-accent-light text-sm font-medium hover:bg-accent/20 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Создать ТЗ с ИИ
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICE_TYPES.map(svc => {
            const Icon = svc.icon
            return (
              <motion.button
                key={svc.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectType(svc.key)}
                className={`text-left p-5 rounded-2xl border ${svc.bg} transition-all duration-200 hover:shadow-lg hover:shadow-black/20 group`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${svc.bg}`}>
                  <Icon className={`w-5 h-5 ${svc.color}`} />
                </div>
                <p className={`font-semibold text-base mb-1 ${svc.color}`}>{svc.title}</p>
                <p className="text-xs text-text-muted leading-relaxed">{svc.desc}</p>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
      </>
    )
  }

  // ── Order form ─────────────────────────────────────────────────────────────
  const Icon = svc!.icon
  const extraFields = EXTRA_FIELDS[selectedType]

  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6 max-w-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={back}
          className="p-2 rounded-lg hover:bg-bg-card border border-border text-text-muted hover:text-text-base transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className={`p-2 rounded-xl ${svc!.bg}`}>
          <Icon className={`w-5 h-5 ${svc!.color}`} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-base">{svc!.title}</h1>
          <p className="text-sm text-text-muted">{svc!.desc}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="rounded-xl border border-border bg-bg-card p-6 space-y-5">

        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Название *</label>
          <input
            name="title"
            value={base.title}
            onChange={handleBase}
            required
            placeholder={
              selectedType === 'CONSULTATION' ? 'Консультация по архитектуре...' :
              selectedType === 'AUDIT'        ? 'Аудит безопасности API...' :
              selectedType === 'OUTSTAFF'     ? 'Поиск Middle React Developer...' :
              selectedType === 'SUPERVISION'  ? 'Технадзор мобильного приложения...' :
              'Разработка платформы для...'
            }
            className="w-full px-3 py-2.5 rounded-lg bg-bg-base border border-border text-text-base placeholder:text-text-faint text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Описание *</label>
          <textarea
            name="description"
            value={base.description}
            onChange={handleBase}
            rows={4}
            required
            placeholder="Опишите задачу подробнее..."
            className="w-full px-3 py-2.5 rounded-lg bg-bg-base border border-border text-text-base placeholder:text-text-faint text-sm focus:outline-none focus:border-accent transition-colors resize-none"
          />
        </div>

        {/* Extra fields */}
        {extraFields.length > 0 && (
          <div className="space-y-4 pt-1">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider border-t border-border pt-4">
              Детали заказа
            </p>
            {extraFields.map(f => (
              <div key={f.name} className="space-y-1">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">{f.label}</label>
                <FieldInput def={f} value={extras[f.name] ?? ''} onChange={handleExtra} />
              </div>
            ))}
          </div>
        )}

        {/* Budget + Deadline */}
        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-border">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Бюджет (KZT)</label>
            <input
              name="budget"
              type="number"
              min={0}
              value={base.budget}
              onChange={handleBase}
              placeholder="500 000"
              className="w-full px-3 py-2.5 rounded-lg bg-bg-base border border-border text-text-base placeholder:text-text-faint text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Дедлайн</label>
            <input
              name="deadline"
              type="date"
              value={base.deadline}
              onChange={handleBase}
              className="w-full px-3 py-2.5 rounded-lg bg-bg-base border border-border text-text-base text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Pricing calculator */}
        {base.budget && Number(base.budget) > 0 && (() => {
          try {
            const calc = calculateCommission(tengeToTiyn(Number(base.budget)))
            return (
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-widest text-text-faint">
                    Пакет {calc.package}
                  </span>
                  {calc.includesTechSupervision && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                      + Технадзор
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-text-base">{formatTenge(tiynToTenge(calc.commissionTiyn))}</p>
                    <p className="text-xs text-text-faint">Комиссия</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-accent-light">{formatTenge(tiynToTenge(calc.totalFromClientTiyn))}</p>
                    <p className="text-xs text-text-faint">Итого с вас</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-400">{formatTenge(tiynToTenge(calc.payoutToExecutorTiyn))}</p>
                    <p className="text-xs text-text-faint">Исполнителю</p>
                  </div>
                </div>
              </div>
            )
          } catch {
            return null
          }
        })()}

        {errMsg && <p className="text-sm text-red-400">{errMsg}</p>}

        <Button type="submit" loading={loading} className="w-full">
          Опубликовать заказ
        </Button>
      </form>
    </motion.div>
  )
}
