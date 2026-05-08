'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, CheckCircle2, XCircle, Trophy, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, SkillDto, QuestionDto, AssessmentResultDto, ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

// ── Test-taking modal ─────────────────────────────────────────────────────────
function TestModal({
  skill,
  profileId,
  onClose,
}: {
  skill: SkillDto
  profileId: string
  onClose: () => void
}) {
  const [questions, setQuestions] = useState<QuestionDto[]>([])
  const [answers,   setAnswers]   = useState<Record<string, number>>({})
  const [loading,   setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result,    setResult]    = useState<AssessmentResultDto | null>(null)
  const [errMsg,    setErrMsg]    = useState<string | null>(null)

  useEffect(() => {
    api.assessment.questions(skill.id, 10)
      .then(qs => setQuestions(qs))
      .catch(e => setErrMsg(e instanceof ApiError ? e.message : 'Ошибка'))
      .finally(() => setLoading(false))
  }, [skill.id])

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      setErrMsg('Ответьте на все вопросы')
      return
    }
    setSubmitting(true)
    setErrMsg(null)
    try {
      const res = await api.assessment.submit({
        profileId,
        skillId: skill.id,
        answers: Object.entries(answers).map(([qId, idx]) => ({
          questionId: qId,
          selectedIndex: idx,
        })),
      })
      setResult(res)
    } catch (e) {
      setErrMsg(e instanceof ApiError ? e.message : 'Ошибка отправки')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[18px] border border-border bg-[linear-gradient(180deg,rgba(6,9,30,0.96),rgba(7,9,45,0.92))] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-center justify-between border-b border-border p-6">
          <div>
            <h2 className="text-lg font-semibold tracking-h3 text-text-base">{skill.name}</h2>
            <p className="text-sm text-text-secondary">{skill.description ?? 'Тест на подтверждение навыка'}</p>
          </div>
          <button onClick={onClose} className="rounded-[8px] border border-transparent px-2 py-1 text-xl text-text-faint transition-colors hover:border-border hover:bg-bg-hover hover:text-text-secondary">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
          ) : result ? (
            // ── Result screen ──
            <div className="text-center space-y-4 py-4">
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${result.status === 'Passed' ? 'bg-[rgba(72,152,188,0.16)]' : 'bg-red-500/16'}`}>
                {result.status === 'Passed'
                  ? <Trophy className="w-8 h-8 text-[#9fdcec]" />
                  : <XCircle className="w-8 h-8 text-red-300" />}
              </div>
              <div>
                <p className={`text-2xl font-semibold tracking-h2 ${result.status === 'Passed' ? 'text-[#a8e0ef]' : 'text-red-300'}`}>
                  {result.status === 'Passed' ? 'Тест пройден!' : 'Тест не пройден'}
                </p>
                <p className="mt-1 text-text-secondary">
                  {result.correctCount} / {result.totalCount} правильных ответов ({result.scorePercent.toFixed(0)}%)
                </p>
                {result.badgeAwarded && (
                  <p className="mt-2 text-sm text-[#efc7d9]">🏅 Получен бейдж навыка!</p>
                )}
              </div>
              <div className="text-left space-y-2 mt-4">
                {result.review.map((r, i) => (
                  <div key={r.questionId} className={`rounded-[10px] border p-3 text-xs ${r.isCorrect ? 'border-[rgba(72,152,188,0.24)] bg-[rgba(72,152,188,0.08)] text-[#c9ecf5]' : 'border-red-500/25 bg-red-500/10 text-red-300'}`}>
                    <p className="font-medium text-text-muted mb-0.5">{i + 1}. {r.questionText}</p>
                    {!r.isCorrect && <p>Правильно: вариант {r.correctIndex + 1}</p>}
                  </div>
                ))}
              </div>
              <Button onClick={onClose} className="mt-4">Закрыть</Button>
            </div>
          ) : (
            // ── Questions ──
            <>
              {errMsg && <p className="rounded-[10px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">{errMsg}</p>}
              {questions.map((q, qi) => (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-[510] text-text-base">{qi + 1}. {q.text}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: oi }))}
                        className={`w-full rounded-[10px] border px-4 py-2.5 text-left text-sm transition-all ${
                          answers[q.id] === oi
                            ? 'border-[rgba(99,138,212,0.32)] bg-[rgba(99,138,212,0.10)] text-[#d7e1ff]'
                            : 'border-border bg-bg-card text-text-secondary hover:border-border-bright hover:bg-bg-elevated hover:text-text-base'
                        }`}
                      >
                        {String.fromCharCode(65 + oi)}. {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-text-faint">{Object.keys(answers).length} / {questions.length} отвечено</span>
                <Button onClick={handleSubmit} loading={submitting}>
                  Отправить ответы <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TestsPage() {
  const { user } = useAuth()
  const [skills,    setSkills]    = useState<SkillDto[]>([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState<SkillDto | null>(null)
  const [errMsg,    setErrMsg]    = useState<string | null>(null)

  useEffect(() => {
    api.assessment.skills()
      .then(s => setSkills(s ?? []))
      .catch(e => setErrMsg(e instanceof ApiError ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(201,143,177,0.18)] bg-[linear-gradient(180deg,rgba(201,143,177,0.12),rgba(122,88,172,0.08))]"><FileText className="w-5 h-5 text-[#efc7d9]" /></div>
          <div>
            <h1 className="text-[28px] font-semibold tracking-h2 text-text-base">Тесты</h1>
            <p className="text-[15px] text-text-secondary">Подтвердите свои навыки через верификацию</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : errMsg ? (
          <div className="rounded-[14px] border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-300">{errMsg}</div>
        ) : skills.length === 0 ? (
          <div className="rounded-[14px] border border-border bg-bg-card p-12 flex flex-col items-center gap-3 text-center shadow-[0_1px_0_rgba(255,255,255,0.03)]">
            <FileText className="w-10 h-10 text-text-faint" />
            <p className="text-text-secondary">Тесты пока недоступны</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {skills.map(skill => (
              <div key={skill.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)] transition-all duration-200 hover:border-border-bright hover:bg-bg-elevated">
                <div className="min-w-0">
                  <p className="truncate text-sm font-[510] tracking-caption text-text-base">{skill.name}</p>
                  {skill.category && (
                    <p className="mt-0.5 text-xs text-[#efc7d9]">{skill.category}</p>
                  )}
                  <p className="text-xs text-text-faint mt-0.5">{skill.questionCount} вопросов</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(skill)}
                  disabled={!user?.profileId}
                >
                  Пройти
                </Button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {selected && user?.profileId && (
          <TestModal
            skill={selected}
            profileId={user.profileId}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

