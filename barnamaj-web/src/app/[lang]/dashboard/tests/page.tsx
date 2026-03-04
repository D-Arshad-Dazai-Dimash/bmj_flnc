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
        className="w-full max-w-2xl bg-bg-surface rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-base">{skill.name}</h2>
            <p className="text-sm text-text-muted">{skill.description ?? 'Тест на подтверждение навыка'}</p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-muted transition-colors text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
          ) : result ? (
            // ── Result screen ──
            <div className="text-center space-y-4 py-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${result.status === 'Passed' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                {result.status === 'Passed'
                  ? <Trophy className="w-8 h-8 text-emerald-400" />
                  : <XCircle className="w-8 h-8 text-red-400" />}
              </div>
              <div>
                <p className={`text-2xl font-bold ${result.status === 'Passed' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.status === 'Passed' ? 'Тест пройден!' : 'Тест не пройден'}
                </p>
                <p className="text-text-muted mt-1">
                  {result.correctCount} / {result.totalCount} правильных ответов ({result.scorePercent.toFixed(0)}%)
                </p>
                {result.badgeAwarded && (
                  <p className="text-sm text-yellow-400 mt-2">🏅 Получен бейдж навыка!</p>
                )}
              </div>
              <div className="text-left space-y-2 mt-4">
                {result.review.map((r, i) => (
                  <div key={r.questionId} className={`text-xs p-3 rounded-lg border ${r.isCorrect ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-red-500/30 bg-red-500/5 text-red-300'}`}>
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
              {errMsg && <p className="text-sm text-red-400 text-center">{errMsg}</p>}
              {questions.map((q, qi) => (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-medium text-text-base">{qi + 1}. {q.text}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: oi }))}
                        className={`w-full text-left text-sm px-4 py-2.5 rounded-lg border transition-all ${
                          answers[q.id] === oi
                            ? 'border-accent bg-accent/15 text-accent-light'
                            : 'border-border bg-bg-card text-text-muted hover:border-border-bright hover:text-text-base'
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
          <div className="p-2 rounded-xl bg-yellow-500/15"><FileText className="w-5 h-5 text-yellow-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-text-base">Тесты</h1>
            <p className="text-sm text-text-muted">Подтвердите свои навыки через верификацию</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : errMsg ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-400">{errMsg}</div>
        ) : skills.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-card p-12 flex flex-col items-center gap-3 text-center">
            <FileText className="w-10 h-10 text-text-faint" />
            <p className="text-text-muted">Тесты пока недоступны</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {skills.map(skill => (
              <div key={skill.id} className="rounded-xl border border-border bg-bg-card p-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-base truncate">{skill.name}</p>
                  {skill.category && (
                    <p className="text-xs text-accent/70 mt-0.5">{skill.category}</p>
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

