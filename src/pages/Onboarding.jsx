import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6

const STEPS = [
  {
    id: 1,
    question: "What's your\nprimary goal?",
    sub: "We'll build your plan around this.",
    field: 'goal',
    type: 'single',
    options: [
      { value: 'muscle',      emoji: '💪', label: 'Build Muscle',     sub: 'Gain size and strength'    },
      { value: 'weight_loss', emoji: '🔥', label: 'Lose Weight',      sub: 'Burn fat, lean out'        },
      { value: 'fitness',     emoji: '🏃', label: 'Get Fit',          sub: 'Improve endurance'         },
      { value: 'performance', emoji: '⚡', label: 'Boost Performance', sub: 'Athletic edge'            },
      { value: 'health',      emoji: '🧘', label: 'Stay Healthy',     sub: 'Consistency and balance'   },
    ],
  },
  {
    id: 2,
    question: "How long have you\nbeen training?",
    sub: "Honest answer = better program.",
    field: 'experience',
    type: 'single',
    options: [
      { value: 'beginner',     emoji: '🌱', label: 'Just Starting',   sub: 'Less than 6 months'       },
      { value: 'intermediate', emoji: '💪', label: 'Some Experience', sub: '6 months – 2 years'       },
      { value: 'advanced',     emoji: '🏆', label: 'Experienced',     sub: '2+ years consistent'      },
    ],
  },
  {
    id: 3,
    question: "What equipment\ndo you have?",
    sub: "Select all that apply.",
    field: 'equipment',
    type: 'multi',
    options: [
      { value: 'full_gym',    emoji: '🏋️', label: 'Full Gym',         sub: 'Barbells, machines, racks'  },
      { value: 'dumbbells',   emoji: '🪀', label: 'Dumbbells Only',   sub: 'Home or limited gym'        },
      { value: 'bands',       emoji: '🪢', label: 'Resistance Bands', sub: 'Anywhere training'          },
      { value: 'bodyweight',  emoji: '🤸', label: 'Bodyweight Only',  sub: 'No equipment needed'        },
    ],
  },
  {
    id: 4,
    question: "How many days\nper week?",
    sub: '',
    field: 'trainingDays',
    type: 'days',
  },
  {
    id: 5,
    question: "A few quick\nnumbers",
    sub: "Used to calculate your targets. Stays private.",
    type: 'stats',
  },
  {
    id: 6,
    question: "Any injuries\nor limitations?",
    sub: "We'll modify exercises to keep you safe.",
    field: 'injuries',
    type: 'multi',
    options: [
      { value: 'knee',     emoji: '🦵', label: 'Knee issues',       sub: 'Avoid deep squats'        },
      { value: 'back',     emoji: '🦴', label: 'Lower back',        sub: 'Avoid heavy deadlifts'    },
      { value: 'shoulder', emoji: '🫀', label: 'Shoulder issues',   sub: 'Limit overhead work'      },
      { value: 'elbow',    emoji: '💪', label: 'Elbow / wrist',     sub: 'Modify grip exercises'    },
      { value: 'none',     emoji: '✅', label: 'None — all good',   sub: 'Full range of motion'     },
    ],
  },
]

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getDayRec(count) {
  if (count <= 2) return 'Good for maintenance'
  if (count <= 3) return 'Great for beginners'
  if (count <= 4) return 'Great for muscle gain'
  if (count <= 5) return 'Advanced program'
  return 'Elite level commitment'
}

// ── Option Card ───────────────────────────────────────────────────────────────

const OptionCard = ({ emoji, label, sub, selected, onSelect }) => (
  <div
    onClick={onSelect}
    className={`rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all duration-150 min-h-[76px] bg-[var(--bg-card)] ${
      selected ? 'border-2 border-[var(--text-cta)]' : 'border border-[var(--border)]'
    }`}
  >
    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-[22px] bg-[var(--bg-pill)]">
      {emoji}
    </div>
    <div className="flex-1">
      <p className={`text-base font-semibold ${selected ? 'text-[var(--text-cta)]' : 'text-[var(--text-primary)]'}`}>{label}</p>
      <p className={`text-[13px] mt-0.5 ${selected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'}`}>{sub}</p>
    </div>
  </div>
)

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { user, setOnboardingComplete } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [answers, setAnswers] = useState({
    goal: '',
    experience: '',
    equipment: [],
    trainingDays: [],
    height: '',
    currentWeight: '',
    targetWeight: '',
    age: '',
    gender: '',
    injuries: [],
  })

  // ── Handlers ────────────────────────────────────────────────────────────────

  function selectSingle(field, value) {
    setAnswers(a => ({ ...a, [field]: value }))
  }

  function toggleMulti(field, value) {
    if (field === 'injuries' && value === 'none') {
      setAnswers(a => ({ ...a, injuries: ['none'] }))
      return
    }
    setAnswers(a => {
      const arr = a[field]
      const filtered = arr.filter(v => v !== 'none')
      return {
        ...a,
        [field]: filtered.includes(value)
          ? filtered.filter(v => v !== value)
          : [...filtered, value],
      }
    })
  }

  function toggleDay(idx) {
    setAnswers(a => {
      const days = a.trainingDays
      return {
        ...a,
        trainingDays: days.includes(idx)
          ? days.filter(d => d !== idx)
          : [...days, idx],
      }
    })
  }

  function canContinue() {
    switch (step) {
      case 1: return answers.goal !== ''
      case 2: return answers.experience !== ''
      case 3: return answers.equipment.length > 0
      case 4: return answers.trainingDays.length > 0
      case 5: return !!(answers.height && answers.currentWeight && answers.age && answers.gender)
      case 6: return true
      default: return false
    }
  }

  function handleContinue() {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1)
    } else {
      handleFinish()
    }
  }

  async function handleFinish() {
    setSaving(true)
    setError('')

    if (!user) {
      setSaving(false)
      setError('Your session expired. Please sign in again.')
      navigate('/login')
      return
    }

    const payload = {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      goal: answers.goal,
      experience: answers.experience,
      equipment: answers.equipment.join(','),
      training_days: answers.trainingDays.length,
      height: parseFloat(answers.height) || null,
      current_weight: parseFloat(answers.currentWeight) || null,
      target_weight: parseFloat(answers.targetWeight) || null,
      age: parseInt(answers.age) || null,
      gender: answers.gender || null,
      injuries: answers.injuries.filter(i => i !== 'none').join(',') || null,
    }

    // Retry up to 3 times with 500 ms delay between attempts
    let dbError = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error: e } = await supabase.from('users').upsert(payload, { onConflict: 'id' })
      if (!e) { dbError = null; break }
      dbError = e
      console.warn(`Onboarding save attempt ${attempt} failed:`, e)
      if (attempt < 3) await new Promise(r => setTimeout(r, 500))
    }

    setSaving(false)

    if (dbError) {
      console.error('Onboarding save error (all retries exhausted):', dbError)
      setError(dbError.message || 'Failed to save your profile. Please try again.')
      return
    }

    // Seed starting weight into progress_entries so the chart shows immediately
    if (payload.current_weight) {
      await supabase.from('progress_entries').insert({
        user_id: user.id,
        weight_kg: payload.current_weight,
        logged_at: new Date().toISOString(),
        notes: 'Starting weight',
      })
    }

    setOnboardingComplete(true)
    navigate('/home')
  }

  // ── Step renderers ────────────────────────────────────────────────────────

  function renderOptions(stepObj) {
    const isMulti = stepObj.type === 'multi'
    return stepObj.options.map(opt => (
      <OptionCard
        key={opt.value}
        {...opt}
        selected={isMulti
          ? answers[stepObj.field].includes(opt.value)
          : answers[stepObj.field] === opt.value}
        onSelect={() => isMulti
          ? toggleMulti(stepObj.field, opt.value)
          : selectSingle(stepObj.field, opt.value)}
      />
    ))
  }

  function renderDays() {
    return (
      <div className="mt-8">
        <div className="flex justify-between gap-2">
          {DAY_LABELS.map((d, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`w-11 h-11 rounded-full text-sm font-semibold transition-all flex-1 bg-[var(--bg-card)] ${
                answers.trainingDays.includes(i)
                  ? 'border-2 border-[var(--text-cta)] text-[var(--text-cta)]'
                  : 'border border-[var(--border)] text-[var(--text-tertiary)]'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="text-center mt-6">
          <p className="text-[64px] font-black text-[var(--text-primary)] leading-none tabular-nums">
            {answers.trainingDays.length}
          </p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">days per week</p>
          {answers.trainingDays.length > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-[var(--success-bg)] text-[var(--success)] rounded-full px-4 py-2 mt-4">
              <span className="text-[13px] font-medium">
                ✓ {getDayRec(answers.trainingDays.length)}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderStats() {
    const fields = [
      { key: 'height',        label: 'Height',  unit: 'cm'  },
      { key: 'currentWeight', label: 'Current', unit: 'kg'  },
      { key: 'targetWeight',  label: 'Target',  unit: 'kg'  },
      { key: 'age',           label: 'Age',     unit: 'yrs' },
    ]
    return (
      <div className="mt-8 space-y-3">
        {fields.map(f => (
          <div
            key={f.key}
            className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] px-5 py-4 flex items-center"
          >
            <span className="text-sm font-medium text-[var(--text-primary)] w-28 shrink-0">{f.label}</span>
            <input
              type="number"
              value={answers[f.key]}
              onChange={e => setAnswers(a => ({ ...a, [f.key]: e.target.value }))}
              placeholder="—"
              className="flex-1 text-[28px] font-semibold text-[var(--text-primary)] tabular-nums bg-transparent focus:outline-none text-right w-full placeholder-[var(--text-tertiary)]"
            />
            <span className="text-sm text-[var(--text-tertiary)] ml-2 shrink-0">{f.unit}</span>
          </div>
        ))}

        {/* Gender */}
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-2 mt-1">Gender</p>
          <div className="flex gap-2">
            {['Male', 'Female', 'Prefer not to say'].map(g => {
              const val = g.toLowerCase().replace(/ /g, '_')
              return (
                <button
                  key={g}
                  onClick={() => setAnswers(a => ({ ...a, gender: val }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all bg-[var(--bg-card)] ${
                    answers.gender === val
                      ? 'border-2 border-[var(--text-cta)] text-[var(--text-cta)]'
                      : 'border border-[var(--border)] text-[var(--text-primary)]'
                  }`}
                >
                  {g}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const currentStep = STEPS[step - 1]
  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col pb-28">

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-[var(--border)]">
        <div
          className="h-full bg-[var(--text-primary)] transition-all duration-[400ms]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Back button */}
      {step > 1 && (
        <button
          onClick={() => setStep(s => s - 1)}
          className="fixed top-4 left-5 z-50 text-xl text-[var(--text-tertiary)] w-10 h-10 flex items-center justify-center"
        >
          ←
        </button>
      )}

      {/* Content */}
      <div className="flex-1 px-5 pt-12">

        {/* Step label */}
        <p className="text-[12px] text-[var(--text-tertiary)] mt-2">Step {step} of {TOTAL_STEPS}</p>

        {/* Question */}
        <h1 className="text-[28px] font-bold text-[var(--text-primary)] mt-3 leading-tight whitespace-pre-line">
          {currentStep.question}
        </h1>

        {/* Subtext */}
        {currentStep.sub && (
          <p className="text-[15px] text-[var(--text-tertiary)] mt-2 leading-relaxed">{currentStep.sub}</p>
        )}

        {/* Step content */}
        <div className="mt-8 space-y-2.5">
          {currentStep.type === 'days'  && renderDays()}
          {currentStep.type === 'stats' && renderStats()}
          {(currentStep.type === 'single' || currentStep.type === 'multi') && renderOptions(currentStep)}
        </div>

        {/* Equipment note */}
        {step === 3 && (
          <p className="text-[12px] text-[var(--text-tertiary)] text-center mt-4">
            You can update this anytime in settings.
          </p>
        )}

        {/* Skip for injuries */}
        {step === 6 && (
          <button
            onClick={() => handleFinish()}
            className="w-full text-center text-[14px] font-medium text-[var(--text-tertiary)] mt-4 underline underline-offset-2"
          >
            Skip for now →
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-[var(--error-bg)] border border-[var(--error)]/20 text-[var(--error)] text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)] px-5 pt-3 pb-10">
        <button
          onClick={handleContinue}
          disabled={!canContinue() || saving}
          className={`w-full h-[52px] rounded-2xl text-base font-semibold transition-all border ${
            canContinue() && !saving
              ? 'bg-[var(--bg-card)] border-[var(--text-primary)] text-[var(--text-primary)]'
              : 'bg-[var(--bg-pill)] border-[var(--border)] text-[var(--text-tertiary)] cursor-not-allowed'
          }`}
        >
          {saving
            ? 'Saving…'
            : step === TOTAL_STEPS
              ? 'Build My Plan →'
              : 'Continue →'}
        </button>
      </div>

    </div>
  )
}
